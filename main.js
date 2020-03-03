const THREE = require('three');
const CANNON = require('cannon');
const OrbitControls = require('./resources/js/vendor/three/OrbitControls.js');
const GLTFLoaders = require('./resources/js/vendor/three/GLTFLoader.js');

//Fixed lengths
const coverHeight = 10;
const wallHeight = 10;
const baseWidth = 200;

//Axes
let axes;
let grid;

//CANNON.js objects
let world;
let sphereBody;
let groundBody;
let coverBody;
let groundMaterial;
let coverMaterial;
let sphereMaterial;
let phyWalls;

//THREE.js sets
let renderer;
let camera;
let scene;
let mouseLoc = new THREE.Vector2(0, 0);

//THREE.js objects
let sphere;
let container;
let walls;
let plane;
let cover;

//Common functions
function convert_radian_to_degree(radians) {
	return radians * 180 / Math.PI;
}

//Fetch coordinate after the rotation
function fetch_coordinate_after_rotation(x, y, angle) {
    const rotationMatrix = [
        [Math.cos(angle), - Math.sin(angle)], 
        [Math.sin(angle), Math.cos(angle)]
    ]

    rotatedX = x * rotationMatrix[0][0] + y * rotationMatrix[0][1];
    rotatedY = x * rotationMatrix[1][0] + y * rotationMatrix[1][1];
    
    return [rotatedX, rotatedY];
}

function init() {

    //Create CANNON world
    createWorld()

    //Assign Canvas DOM
    container = document.querySelector( '#scene-container' );

    //Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0x8FBCD4 ); 
    
    //Create axes
    createAxes();
    
    //Create grid 
    const size = 100;
    const divisions = 100;
    grid = new THREE.GridHelper( size, divisions );
    //scene.add( grid );

    //Create camera
    createCamera();

    //Create controls
    createControls();
    
    //Set up lights
    createLights();

    //Set up ground. Physics should be defined in this.
    createGround();

    //Create walls
    createWalls();

    //Set up meshes. Physics should be defined in this.
    createMeshes();

    //Set up renderer
    createRenderer();

    renderer.physicallyCorrectLights = true;


    //Set contact material behaviour
    var groundCollision = new CANNON.ContactMaterial(groundMaterial, sphereMaterial, { friction: 0.0, restitution: 0.5 });
    world.addContactMaterial(groundCollision);

    var coverCollision = new CANNON.ContactMaterial(coverMaterial, sphereMaterial, { friction: 0.0, restitution: 0.5 });
    world.addContactMaterial(coverCollision);

    // start the animation loop
    renderer.setAnimationLoop( () => {
    update();
    render();
    } );
    
}

function createWorld() {
    // cannon.jsでワールド作成
    world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);                   // 重力を設定
    world.broadphase = new CANNON.NaiveBroadphase();  // ぶつかっている可能性のあるオブジェクト同士を見つける
    world.solver.iterations = 8;                      // 反復計算回数
    world.solver.tolerance = 0.1;                     // 許容値
}

function createAxes() {
    axes = new THREE.AxesHelper( 50 );
    scene.add( axes );
}

function createGroundBody(widthGround, lengthGround, heightGround, angle) {
    groundMaterial = new CANNON.Material();
    coverMaterial = new CANNON.Material();

    let groundShape = new CANNON.Box(new CANNON.Vec3(widthGround/2, lengthGround/2, heightGround/2));
    groundBody = new CANNON.Body({ mass: 0, material: groundMaterial });
    coverBody = new CANNON.Body({ mass: 0, material: coverMaterial });

    groundBody.addShape(groundShape);
    coverBody.addShape(groundShape);

    let radianAngle = 0;
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3( 1, 0, 0), radianAngle );  

    groundBody.position.set(0, 0, 0);
    coverBody.position.set( 0, coverHeight, 0);

    world.addBody(groundBody);
    world.addBody(coverBody);
}

function createGround() {
    const widthGround = 200;
    const lengthGround = 1;
    const heightGround = 200;
    const planeGeometry = new THREE.BoxBufferGeometry(widthGround, lengthGround, heightGround);
    const planeMaterial = new THREE.MeshStandardMaterial( {
        color: 0xffffff,
        opacity: 0.5,
        transparent: true,
        flatShading: true,
    });
    plane = new THREE.Mesh(planeGeometry, planeMaterial );
    cover = plane.clone();
    scene.add(plane,
        cover
        );
    //Create CANNON ground body
    createGroundBody(widthGround, lengthGround, heightGround, 1);
}

function createWalls() {
    walls = new THREE.Group();
    const materials = createMaterials();
    const wall_geometry = new THREE.BoxBufferGeometry( baseWidth, wallHeight, 3 );
    const wall1 = new THREE.Mesh(wall_geometry, materials.body);
    wall1.position.set( 0, wallHeight/2, 100 );
    const wall2 = wall1.clone();
    wall2.position.set( 0, wallHeight/2, -100 );
    
    walls.add(
        wall1,
        wall2,
    //    wall3
    );

    scene.add(walls);
}

//Create sphere body
function createSphereBody(radius) {
    const sphereInitialHeight = 5;
    const damping = 0.01;
    const sphereMass = 10;
    sphereMaterial = createMaterials().body;

    sphereBody = new CANNON.Body({
        mass: sphereMass,
        material: sphereMaterial,
        position: new CANNON.Vec3(0 , sphereInitialHeight , 0)
    });
    const sphereShape = new CANNON.Sphere(radius);
    sphereBody.addShape(sphereShape);
    sphereBody.linearDamping = damping;
    
    world.addBody(sphereBody);
}

//Configure meshes
function createMeshes() {
    const radius = 4;
    //Create THREE sphere
    let sphereGeometry = new THREE.SphereGeometry(radius, widthSegments=20, heightSegments=20);
    let materials = createMaterials();
    sphere = new THREE.Mesh(sphereGeometry, materials.body);
    scene.add(sphere);
    
    //Create CANNON sphere
    createSphereBody(radius);
}

// Configure renderer and set it into container
function createRenderer() {
    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setSize( window.innerWidth, window.innerHeight );
    container.appendChild( renderer.domElement );
}

function createMaterials() {

    const body = new THREE.MeshStandardMaterial( {
        color: 0xffffff,
        flatShading: true,
    })
    // just as with textures, we need to put colors into linear color space
    body.color.convertSRGBToLinear();

    const detail = new THREE.MeshStandardMaterial( {
        color: 0x333333, // darkgrey
        flatShading: true,
      } );
    
    detail.color.convertSRGBToLinear();

    return {
        body,
        detail,
    };
  
}
  
function createGeometries() {
    //create nose
    const nose = new THREE.CylinderBufferGeometry( 0.75, 0.75, 3, 20 );
    //create cabin
    const cabin = new THREE.BoxBufferGeometry( 2, 2, 1.5 );
    //create chimney
    const chimney = new THREE.CylinderBufferGeometry( 0.3, 0.1, 0.5 );
    //create wheel
    const wheel = new THREE.CylinderBufferGeometry( 0.4, 0.4, 1.5, 16 );
    wheel.rotateX( Math.PI / 2 );

    return {
        nose,
        cabin,
        chimney,
        wheel,
    }
}

// Configure camera
function createCamera() {
    camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );
    camera.position.set( -200, 130, 0 );
    camera.lookAt( 0, 0, 0 );
}

// Configure lights
function createLights() {
    const ambientLight = new THREE.HemisphereLight(
        0xddeeff, // bright sky color
        0x202020, // dim ground color
        3, // intensity
    );

    const mainLight = new THREE.DirectionalLight( 0xffffff, 5 );
    mainLight.position.set( 40, 40, -40 );

    scene.add( ambientLight, mainLight );
}

// Configure controls
function createControls() {

    controls = new THREE.OrbitControls( camera, container );
  
}

// perform any updates to the scene, called once per frame
// avoid heavy computation here
function update() {
     //if ( mouseLoc.x > 0.5 && mouseLoc.x < 0.9 ) { 
    var axes = new THREE.Vector3(1, 0, 0).normalize();
     //get radian angle using inverse trigonometric function
    radianAngle = - Math.asin(mouseLoc.y);

    //coverBody.position.z = coverHeight * Math.sin(radianAngle);
    //coverBody.position.y = coverHeight * Math.cos(radianAngle);
    
    //groundBody.quaternion.setFromAxisAngle(axes, radianAngle);
    //coverBody.quaternion.setFromAxisAngle(axes, radianAngle);
    //console.log(convert_radian_to_degree(radianAngle));
    
    //}
    console.log(fetch_coordinate_after_rotation(walls.children[0].position.z, walls.children[0].position.y, radianAngle));
    //world time progress
    world.step(1 / 60);
    // can,non.jsからthree.jsにオブジェクトの位置をコピー
    sphere.position.copy(sphereBody.position);
    sphere.quaternion.copy(sphereBody.quaternion);

    plane.position.copy(groundBody.position);
    plane.quaternion.copy(groundBody.quaternion);  
    cover.position.copy(coverBody.position);
    cover.quaternion.copy(coverBody.quaternion); 
    // increase the mesh's rotation each frame
    //train.rotation.z += 0.01;
    //train.rotation.x += 0.01;
    //train.rotation.y += 0.01;
}

// render, or 'draw a still image', of the scene
function render() {

    renderer.render( scene, camera );
  
}
// Resize Event
function onWindowResize() {

  // set the aspect ratio to match the new browser window aspect ratio
  camera.aspect = container.clientWidth / container.clientHeight;
  // update the camera's frustum
  camera.updateProjectionMatrix();
  // update the size of the renderer AND the canvas
  renderer.setSize( container.clientWidth, container.clientHeight );
}

function loadModels() {

    const loader = new THREE.GLTFLoader();
    
    const url = 'resources/models/Parrot.glb';

    // A reusable function to set up the models. We're passing in a position parameter
    // so that they can be individually placed around the scene
    const onLoad = ( gltf, position ) => {

        console.log(gltf);
        const model = gltf.scene.children[ 0 ];
        model.position.copy( position );
        model.scale.set( 0.05 , 0.05, 0.05 );
        //const animation = gltf.animations[ 0 ];

        //const mixer = new THREE.AnimationMixer( model );
        //mixers.push( mixer );

        //const action = mixer.clipAction( animation );
        //action.play();
        scene.add( model );

    };
    
    // load the first model. Each model is loaded asynchronously,
    // so don't make any assumption about which one will finish loading first
    const parrotPosition = new THREE.Vector3( 0, 5, 5 );
    loader.load( url, gltf => onLoad( gltf, parrotPosition ));
    
}

function onMouseMove( event ) {

	// calculate mouse position in normalized device coordinates
	// (-1 to +1) for both components

	mouseLoc.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	mouseLoc.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
}

// call the init function to set everything up
init();

window.addEventListener( 'resize', onWindowResize );
window.addEventListener( 'mousemove', onMouseMove, false );
    

