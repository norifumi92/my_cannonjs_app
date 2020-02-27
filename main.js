const THREE = require('three');
const CANNON = require('cannon');
const OrbitControls = require('./resources/js/vendor/three/OrbitControls.js');
const GLTFLoaders = require('./resources/js/vendor/three/GLTFLoader.js');
// these need to be accessed inside more than one function so we'll declare them first
let world;
let renderer;
let camera;
let scene;
//let train;
//let light;
let box;
let container;
let axes;
let phyBox;

function init() {

    //Create CANNON world
    createWorld()

    //Create CANNON body
    createBodyMass()

    //Create CANNON ground mass
    createGroundMass()

    container = document.querySelector( '#scene-container' );

    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0x8FBCD4 ); 
    
    axes = new THREE.AxesHelper( 50 );
    scene.add( axes );

    createCamera();
    createControls();
    createLights();
    createGround();
    createMeshes();
    //box.position.set( 0, 20, 0);
    //loadModels();
    createRenderer();

    renderer.physicallyCorrectLights = true;

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

function createBodyMass() {
    // cannon.jsで箱作成
    const boxMass = 1;                                                 // 箱の質量
    const boxShape = new CANNON.Box(new CANNON.Vec3(5, 5, 5));         // 箱の形状
    phyBox = new CANNON.Body({mass: boxMass, shape: boxShape});  // 箱作成
    phyBox.position.set(0, 20, 0);                                     // 箱の位置
    phyBox.angularVelocity.set(0.1, 0.1, 0.1);                         // 角速度
    phyBox.angularDamping = 0.1;                                       // 減衰率
    world.addBody(phyBox);                                             // ワールドに箱追加
}

function createGroundMass() {
    const planeMass = 0;                                               // 質量を0にすると衝突しても動かない                                                           
    const planeShape = new CANNON.Plane();
    const phyPlane = new CANNON.Body({mass: planeMass, shape: planeShape});
    phyPlane.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);  // X軸に90度回転  
    phyPlane.position.set(0, 0, 0);
    world.addBody(phyPlane);
}

function createGround() {
    // 床
    const planeGeometry = new THREE.PlaneGeometry(30, 30, 1, 1);
    const planeMaterial = new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide} );
    plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = Math.PI / 2;
    scene.add(plane);
}

//Configure meshes
function createMeshes() {
    // 箱
    const boxGeometry = new THREE.BoxGeometry(10, 10, 10);
    const boxMaterial = new THREE.MeshPhongMaterial({color: 0xffffff});
    box = new THREE.Mesh(boxGeometry, boxMaterial);
    scene.add(box);
}

// Configure renderer and set it into container
function createRenderer() {
    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setSize( window.innerWidth, window.innerHeight );
    container.appendChild( renderer.domElement );
}

function createMaterials() {

    const body = new THREE.MeshStandardMaterial( {
        color: 0xff3333,
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
    camera.position.set( 0, 50, 50 );
    camera.lookAt( 0, 0, 0 );
}

// Configure lights
function createLights() {
    const ambientLight = new THREE.HemisphereLight(
        0xddeeff, // bright sky color
        0x202020, // dim ground color
        5, // intensity
    );

    const mainLight = new THREE.DirectionalLight( 0xffffff, 5 );
    mainLight.position.set( 10, 10, 10 );

    scene.add( ambientLight, mainLight );
}

// Configure controls
function createControls() {

    controls = new THREE.OrbitControls( camera, container );
  
}

// perform any updates to the scene, called once per frame
// avoid heavy computation here
function update() {
    
    // cannon.jsからthree.jsにオブジェクトの位置をコピー
    box.position.copy(phyBox.position);
    box.quaternion.copy(phyBox.quaternion);
    plane.position.copy(phyPlane.position);
    plane.quaternion.copy(phyPlane.quaternion);  
    //world time progress
    world.step(1 / 60);
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

// call the init function to set everything up
init();

window.addEventListener( 'resize', onWindowResize );
