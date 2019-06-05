// - Global variables -

const WINDOW_WIDTH = window.innerWidth;
const WINDOW_HEIGHT = window.innerHeight;

// Graphics variables
let container;
let camera, controls, scene, renderer;
let clock = new THREE.Clock();
let mouseCoords = new THREE.Vector2();
let raycaster = new THREE.Raycaster();
let textureLoader;
let groundTextureLink = "https://img.freepik.com/free-vector/cartoon-stone-texture_1110-576.jpg?size=338&ext=jpg";
let textureRepeats = 5;
let wallMaterial = new THREE.MeshPhongMaterial( { color: 0Xffffd3 } );
let ballMaterial = new THREE.MeshPhongMaterial( { color: 0x202020 } );
let bgColor = new THREE.Color( 0x82d9ed );

// Physics variables
let gravityConstant = 12;
let collisionConfiguration;
let dispatcher;
let broadphase;
let solver;
let physicsWorld;
let margin = 0.05;
let convexBreaker = new THREE.ConvexObjectBreaker();

// Rigid bodies include all movable objects
let rigidBodies = [];
let pos = new THREE.Vector3();
let quat = new THREE.Quaternion();
let transformAux1;
let tempBtVec3_1;
let time = 0;
let objectsToRemove = [];
objectsToRemove.fill(null, 0, 500);
let numObjectsToRemove = 0;
let impactPoint = new THREE.Vector3();
let impactNormal = new THREE.Vector3();

//Ball Properties
let ballMass = 100;
let ballRadius = 0.4;
let ballLaunchSpeed = 50;

//Ground and Wall Properties
let groundX = 40;
let groundY = 1;
let groundZ = 40;
let groundMass = 0;
let wallX = groundX;
let wallY = 10;
let wallZ = 1;
let wallMass = 0;

//Mouse/touch controls
let dragged = false;

// - Main code -
Ammo().then( function( AmmoLib ) {
	Ammo = AmmoLib;
	init();
	animate();
} );

// - Functions -
function init() {
	initGraphics();
	initPhysics();
	createObjects();
	initInput();
}

function initGraphics() {
	container = document.getElementById( 'container' );
	camera = new THREE.PerspectiveCamera( 60, WINDOW_WIDTH / WINDOW_HEIGHT, 0.2, 2000 );
	scene = new THREE.Scene();
	scene.background = bgColor;
	camera.position.set( - 14, 8, 16 );
	renderer = new THREE.WebGLRenderer();
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.shadowMap.enabled = true;
	container.appendChild( renderer.domElement );
	controls = new THREE.OrbitControls( camera, renderer.domElement );
	controls.target.set( 0, 2, 0 );
	controls.update();
	textureLoader = new THREE.TextureLoader();
	let ambientLight = new THREE.AmbientLight( 0x707070 );
	scene.add( ambientLight );
	let light = new THREE.DirectionalLight( 0xffffff, 1 );
	light.position.set( - 10, 18, 5 );
	light.castShadow = true;
	let d = 14;
	light.shadow.camera.left = - d;
	light.shadow.camera.right = d;
	light.shadow.camera.top = d;
	light.shadow.camera.bottom = - d;
	light.shadow.camera.near = 2;
	light.shadow.camera.far = 50;
	light.shadow.mapSize.x = 1024;
	light.shadow.mapSize.y = 1024;
	scene.add( light );

	window.addEventListener( 'resize', onWindowResize, false );
}

function initPhysics() {
	// Physics configuration
	collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
	dispatcher = new Ammo.btCollisionDispatcher( collisionConfiguration );
	broadphase = new Ammo.btDbvtBroadphase();
	solver = new Ammo.btSequentialImpulseConstraintSolver();
	physicsWorld = new Ammo.btDiscreteDynamicsWorld( dispatcher, broadphase, solver, collisionConfiguration );
	physicsWorld.setGravity( new Ammo.btVector3( 0, - gravityConstant, 0 ) );
	transformAux1 = new Ammo.btTransform();
	tempBtVec3_1 = new Ammo.btVector3( 0, 0, 0 );
}

function createObject( mass, halfExtents, pos, quat, material ) {
	let object = new THREE.Mesh( new THREE.BoxBufferGeometry( halfExtents.x * 2, halfExtents.y * 2, halfExtents.z * 2 ), material );
	object.position.copy( pos );
	object.quaternion.copy( quat );
	convexBreaker.prepareBreakableObject( object, mass, new THREE.Vector3(), new THREE.Vector3(), true );
	createDebrisFromBreakableObject( object );
}

function createObjects() {
	// Ground
	pos.set( 0, - 0.5, 0 );
	quat.set( 0, 0, 0, 1 );
	let ground = createParalellepipedWithPhysics( groundZ, groundY, groundZ, groundMass, pos, quat, new THREE.MeshPhongMaterial( { color: 0xFFFFFF } ) );
	ground.receiveShadow = true;
	textureLoader.load(groundTextureLink, function( texture ) {
		texture.wrapS = THREE.RepeatWrapping;
		texture.wrapT = THREE.RepeatWrapping;
		texture.repeat.set( textureRepeats, textureRepeats );
		ground.material.map = texture;
		ground.material.needsUpdate = true;
	} );

  //Walls
  pos.set(0, wallY/2, -(groundZ/2 - wallZ/2));
  let wall0 = createParalellepipedWithPhysics(wallX, wallY, wallZ, wallMass, pos, quat, wallMaterial );
  pos.set(groundX/2 - wallZ/2, wallY/2, 0)
  let wall1 = createParalellepipedWithPhysics(wallZ, wallY, wallX, wallMass, pos, quat, wallMaterial );

	// Tower 1
	let towerMass = 1000;
	let towerHalfExtents = new THREE.Vector3( 2, 5, 2 );
	pos.set( -8, 5, 0 );
	quat.set( 0, 0, 0, 1 );
	createObject( towerMass, towerHalfExtents, pos, quat, createMaterial( 0xB03014 ) );

  // Tower 2
	pos.set( 8, 5, 0 );
	quat.set( 0, 0, 0, 1 );
	createObject( towerMass, towerHalfExtents, pos, quat, createMaterial( 0xB03214 ) );

  //Bridge
	let bridgeMass = 100;
	let bridgeHalfExtents = new THREE.Vector3( 7, 0.2, 1.5 );
	pos.set( 0, 10.2, 0 );
	quat.set( 0, 0, 0, 1 );
	createObject( bridgeMass, bridgeHalfExtents, pos, quat, createMaterial( 0xB3B865 ) );

  // Stones
	let stoneMass = 120;
	let stoneHalfExtents = new THREE.Vector3( 1, 2, 0.15 );
	let numStones = 8;
	quat.set( 0, 0, 0, 1 );
	for ( let i = 0; i < numStones; i++ ) {
		pos.set( 0, 2, 15 * ( 0.5 - i / ( numStones + 1 ) ) );
		createObject( stoneMass, stoneHalfExtents, pos, quat, createMaterial( 0x545454 ) );
	}

  //Blocks
  let blockMass = 1000;
  pos.set(-5, 0, -10);
  quat.set( 0, 0.5, 0, 1 );
  let blockHalfExtents = new THREE.Vector3( 3, 3, 3 );
  createObject( blockMass, blockHalfExtents, pos, quat, createMaterial( 0xb1ff2b ) );

	// Mountain
	let mountainMass = 860;
	let mountainHalfExtents = new THREE.Vector3( 4, 5, 4 );
	pos.set( 5, mountainHalfExtents.y * 0.5, - 7 );
	quat.set( 0, 0, 0, 1 );
	let mountainPoints = [];
	mountainPoints.push( new THREE.Vector3( mountainHalfExtents.x, - mountainHalfExtents.y, mountainHalfExtents.z ) );
	mountainPoints.push( new THREE.Vector3( - mountainHalfExtents.x, - mountainHalfExtents.y, mountainHalfExtents.z ) );
	mountainPoints.push( new THREE.Vector3( mountainHalfExtents.x, - mountainHalfExtents.y, - mountainHalfExtents.z ) );
	mountainPoints.push( new THREE.Vector3( - mountainHalfExtents.x, - mountainHalfExtents.y, - mountainHalfExtents.z ) );
	mountainPoints.push( new THREE.Vector3( 0, mountainHalfExtents.y, 0 ) );
	let mountain = new THREE.Mesh( new THREE.ConvexBufferGeometry( mountainPoints ), createMaterial( 0x5a8e00 ) );
	mountain.position.copy( pos );
	mountain.quaternion.copy( quat );
	convexBreaker.prepareBreakableObject( mountain, mountainMass, new THREE.Vector3(), new THREE.Vector3(), true );
	createDebrisFromBreakableObject( mountain );
}

function createParalellepipedWithPhysics( sx, sy, sz, mass, pos, quat, material ) {
	let object = new THREE.Mesh( new THREE.BoxBufferGeometry( sx, sy, sz, 1, 1, 1 ), material );
	let shape = new Ammo.btBoxShape( new Ammo.btVector3( sx * 0.5, sy * 0.5, sz * 0.5 ) );
	shape.setMargin( margin );
	createRigidBody( object, shape, mass, pos, quat );
	return object;
}

function createDebrisFromBreakableObject( object ) {
	object.castShadow = true;
	object.receiveShadow = true;
	let shape = createConvexHullPhysicsShape( object.geometry.attributes.position.array );
	shape.setMargin( margin );
	let body = createRigidBody( object, shape, object.userData.mass, null, null, object.userData.velocity, object.userData.angularVelocity );
	// Set pointer back to the three object only in the debris objects
	let btVecUserData = new Ammo.btVector3( 0, 0, 0 );
	btVecUserData.threeObject = object;
	body.setUserPointer( btVecUserData );
}

function removeDebris( object ) {
	scene.remove( object );
	physicsWorld.removeRigidBody( object.userData.physicsBody );
}

function createConvexHullPhysicsShape( coords ) {
	let shape = new Ammo.btConvexHullShape();
	for ( let i = 0, il = coords.length; i < il; i+= 3 ) {
		tempBtVec3_1.setValue( coords[ i ], coords[ i + 1 ], coords[ i + 2 ] );
		let lastOne = ( i >= ( il - 3 ) );
		shape.addPoint( tempBtVec3_1, lastOne );
	}
	return shape;
}

function createRigidBody( object, physicsShape, mass, pos, quat, vel, angVel ) {
	if ( pos ) {
		object.position.copy( pos );
	}
	else {
		pos = object.position;
	}
	if ( quat ) {
		object.quaternion.copy( quat );
	}
	else {
		quat = object.quaternion;
	}
	let transform = new Ammo.btTransform();
	transform.setIdentity();
	transform.setOrigin( new Ammo.btVector3( pos.x, pos.y, pos.z ) );
	transform.setRotation( new Ammo.btQuaternion( quat.x, quat.y, quat.z, quat.w ) );
	let motionState = new Ammo.btDefaultMotionState( transform );
	let localInertia = new Ammo.btVector3( 0, 0, 0 );
	physicsShape.calculateLocalInertia( mass, localInertia );
	let rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, physicsShape, localInertia );
	let body = new Ammo.btRigidBody( rbInfo );
	body.setFriction( 0.5 );
	if ( vel ) {
		body.setLinearVelocity( new Ammo.btVector3( vel.x, vel.y, vel.z ) );
	}
	if ( angVel ) {
		body.setAngularVelocity( new Ammo.btVector3( angVel.x, angVel.y, angVel.z ) );
	}
	object.userData.physicsBody = body;
	object.userData.collided = false;
	scene.add( object );
	if ( mass > 0 ) {
		rigidBodies.push( object );
		// Disable deactivation
		body.setActivationState( 4 );
	}
	physicsWorld.addRigidBody( body );
	return body;
}

function createRandomColor() {
	return Math.floor( Math.random() * ( 1 << 24 ) );
}

function createMaterial( color ) {
	color = color || createRandomColor();
	return new THREE.MeshPhongMaterial( { color: color } );
}
function initInput() {
	window.addEventListener('mouseup', onMouseUp, false);
  window.addEventListener('mousedown', onMouseDown, false);
  window.addEventListener('mousemove', onMouseMove, false);
}

let mouseDown = false;

function onMouseDown() {
  mouseDown = true;
}

function onMouseMove() {
  if (mouseDown) {
    dragged = true;
  }
}

function onMouseUp() {
  mouseCoords.set(
    ( event.clientX / window.innerWidth ) * 2 - 1,
    - ( event.clientY / window.innerHeight ) * 2 + 1
  );
  raycaster.setFromCamera( mouseCoords, camera );

  if (dragged === true) {
    dragged = false;
    mouseDown = false;
    return;
  }

  // Creates a ball and throws it

  let ball = new THREE.Mesh( new THREE.SphereBufferGeometry( ballRadius, 14, 10 ), ballMaterial );
  ball.castShadow = true;
  ball.receiveShadow = true;
  let ballShape = new Ammo.btSphereShape( ballRadius );
  ballShape.setMargin( margin );
  pos.copy( raycaster.ray.direction );
  pos.add( raycaster.ray.origin );
  quat.set( 0, 0, 0, 1 );
  let ballBody = createRigidBody( ball, ballShape, ballMass, pos, quat );
  pos.copy( raycaster.ray.direction );
  pos.multiplyScalar( ballLaunchSpeed );
  ballBody.setLinearVelocity( new Ammo.btVector3( pos.x, pos.y, pos.z ) );
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
}
function animate() {
	requestAnimationFrame( animate );
	render();
	//stats.update();
}
function render() {
	let deltaTime = clock.getDelta();
	updatePhysics( deltaTime );
	renderer.render( scene, camera );
	time += deltaTime;
}
function updatePhysics( deltaTime ) {
	// Step world
	physicsWorld.stepSimulation( deltaTime, 10 );
	// Update rigid bodies
	for ( let i = 0, il = rigidBodies.length; i < il; i++ ) {
		let objThree = rigidBodies[ i ];
		let objPhys = objThree.userData.physicsBody;
		let ms = objPhys.getMotionState();
		if ( ms ) {
			ms.getWorldTransform( transformAux1 );
			let p = transformAux1.getOrigin();
			let q = transformAux1.getRotation();
			objThree.position.set( p.x(), p.y(), p.z() );
			objThree.quaternion.set( q.x(), q.y(), q.z(), q.w() );
			objThree.userData.collided = false;
		}
	}
	for ( let i = 0, il = dispatcher.getNumManifolds(); i < il; i ++ ) {
		let contactManifold = dispatcher.getManifoldByIndexInternal( i );
		let rb0 = Ammo.castObject( contactManifold.getBody0(), Ammo.btRigidBody );
		let rb1 = Ammo.castObject( contactManifold.getBody1(), Ammo.btRigidBody );
		let threeObject0 = Ammo.castObject( rb0.getUserPointer(), Ammo.btVector3 ).threeObject;
		let threeObject1 = Ammo.castObject( rb1.getUserPointer(), Ammo.btVector3 ).threeObject;
		if ( ! threeObject0 && ! threeObject1 ) {
			continue;
		}
		let userData0 = threeObject0 ? threeObject0.userData : null;
		let userData1 = threeObject1 ? threeObject1.userData : null;
		let breakable0 = userData0 ? userData0.breakable : false;
		let breakable1 = userData1 ? userData1.breakable : false;
		let collided0 = userData0 ? userData0.collided : false;
		let collided1 = userData1 ? userData1.collided : false;
		if ( ( ! breakable0 && ! breakable1 ) || ( collided0 && collided1 ) ) {
			continue;
		}
		let contact = false;
		let maxImpulse = 0;
		for ( let j = 0, jl = contactManifold.getNumContacts(); j < jl; j ++ ) {
			let contactPoint = contactManifold.getContactPoint( j );
			if ( contactPoint.getDistance() < 0 ) {
				contact = true;
				let impulse = contactPoint.getAppliedImpulse();
				if ( impulse > maxImpulse ) {
					maxImpulse = impulse;
					let pos = contactPoint.get_m_positionWorldOnB();
					let normal = contactPoint.get_m_normalWorldOnB();
					impactPoint.set( pos.x(), pos.y(), pos.z() );
					impactNormal.set( normal.x(), normal.y(), normal.z() );
				}
				break;
			}
		}
		// If no point has contact, abort
		if ( ! contact ) {
			continue;
		}
		// Subdivision
		let fractureImpulse = 250;
		if ( breakable0 && !collided0 && maxImpulse > fractureImpulse ) {
			let debris = convexBreaker.subdivideByImpact( threeObject0, impactPoint, impactNormal , 1, 2, 1.5 );
			let numObjects = debris.length;
			for ( let j = 0; j < numObjects; j++ ) {
				let vel = rb0.getLinearVelocity();
				let angVel = rb0.getAngularVelocity();
				let fragment = debris[ j ];
				fragment.userData.velocity.set( vel.x(), vel.y(), vel.z() );
				fragment.userData.angularVelocity.set( angVel.x(), angVel.y(), angVel.z() );
				createDebrisFromBreakableObject( fragment );
			}
			objectsToRemove[ numObjectsToRemove++ ] = threeObject0;
			userData0.collided = true;
		}
		if ( breakable1 && !collided1 && maxImpulse > fractureImpulse ) {
			let debris = convexBreaker.subdivideByImpact( threeObject1, impactPoint, impactNormal , 1, 2, 1.5 );
			let numObjects = debris.length;
			for ( let j = 0; j < numObjects; j++ ) {
				let vel = rb1.getLinearVelocity();
				let angVel = rb1.getAngularVelocity();
				let fragment = debris[ j ];
				fragment.userData.velocity.set( vel.x(), vel.y(), vel.z() );
				fragment.userData.angularVelocity.set( angVel.x(), angVel.y(), angVel.z() );
				createDebrisFromBreakableObject( fragment );
			}
			objectsToRemove[ numObjectsToRemove++ ] = threeObject1;
			userData1.collided = true;
		}
	}
	for ( let i = 0; i < numObjectsToRemove; i++ ) {
		removeDebris( objectsToRemove[ i ] );
	}
	numObjectsToRemove = 0;
}

/*
const WINDOW_WIDTH = window.innerWidth;
const WINDOW_HEIGHT = window.innerHeight;

let container;
let camera, controls, scene, renderer;
let textureLoader;
let clock = new THREE.Clock();

let mouseCoords = new THREE.Vector2();
let raycaster = new THREE.Raycaster();
let ballMaterial = new THREE.MeshPhongMaterial({color: 0x018DAD});

//Physics stuff
let gravityConstant = 9;
let collisionConfiguration;
let dispatcher;
let broadphase;
let solver;
let physicsWorld;// = new Ammo.btDiscreteDynamicsWorld( dispatcher, broadphase, solver, collisionConfiguration );
let margin = 0.05;

let ballMass = 45;
let ballRadius = 0.4;
let ballSpeed = 30;

let convexBreaker = new THREE.ConvexObjectBreaker();

//Array of rigid bodies that includes all movable objects
let rigidBodies = [];

let pos = new THREE.Vector3();
let quat = new THREE.Quaternion();
let transformAux1;
let tempBtVec3_1;

let time = 0;

let objectsToRemove = [];
objectsToRemove.fill(null, 0, 500);
let numObjectsToRemove = 0;

let impactPoint = new THREE.Vector3();
let impactNormal = new THREE.Vector3();

let windowResize;

Ammo().then(function(AmmoLib) {
  Ammo = AmmoLib;
  init();
  animate();
});

function init() {
  initGraphics();
  initPhysics;
  createObjects();
  initInput();
  windowResize = new THREEx.WindowResize(renderer, camera);
}

function initGraphics() {
  container = document.getElementById('container');
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(60, WINDOW_WIDTH/WINDOW_HEIGHT);
  camera.position.set(-14, 8, 16);

  //scene.background = new THREE.Color(0xBFD1E5);

  renderer = new THREE.WebGLRenderer();
  //renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(WINDOW_WIDTH, WINDOW_HEIGHT);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  //Orbit controls
  // controls = new THREE.OrbitControls( camera, renderer.domElement );
	// controls.target.set( 0, 2, 0 );
	// controls.update();

  textureLoader = new THREE.TextureLoader();

  let ambientLight = new THREE.AmbientLight(0x707070);
  scene.add(ambientLight);

  let light = new THREE.DirectionalLight(0xFFFFFF, 1);
  light.position.set(-10, 18, 5);
  light.castShadow = true;

  //???
  // let d = 14;
  // light.shadow.camera.left = - d;
	// light.shadow.camera.right = d;
	// light.shadow.camera.top = d;
	// light.shadow.camera.bottom = - d;
	light.shadow.camera.near = 2;
	light.shadow.camera.far = 50;
	light.shadow.mapSize.x = 1024;
	light.shadow.mapSize.y = 1024;

  scene.add(light);

  //window.addEventListener( 'resize', onWindowResize, false );

}

function initPhysics() {
	// Physics configuration
	collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
	dispatcher = new Ammo.btCollisionDispatcher( collisionConfiguration );
	broadphase = new Ammo.btDbvtBroadphase();
	solver = new Ammo.btSequentialImpulseConstraintSolver();
	physicsWorld = new Ammo.btDiscreteDynamicsWorld( dispatcher, broadphase, solver, collisionConfiguration );
	physicsWorld.setGravity( new Ammo.btVector3( 0, - gravityConstant, 0 ) );
	transformAux1 = new Ammo.btTransform();
	tempBtVec3_1 = new Ammo.btVector3( 0, 0, 0 );
}

function createObject( mass, halfExtents, pos, quat, material ) {
  let newBoxBufferGeometry = new THREE.BoxBufferGeometry(halfExtents.x * 2, halfExtents.y * 2, halfExtents.z * 2 );
	let object = new THREE.Mesh(newBoxBufferGeometry, material);
	object.position.copy(pos);
	object.quaternion.copy(quat);
	convexBreaker.prepareBreakableObject(object, mass, new THREE.Vector3(), new THREE.Vector3(), true);
	createDebrisFromBreakableObject(object);
}

function createObjects() {
	// Ground
	pos.set(0, - 0.5, 0);
	quat.set(0, 0, 0, 1);
	let ground = createParalellepipedWithPhysics( 40, 1, 40, 0, pos, quat, new THREE.MeshPhongMaterial( { color: 0xFFFFFF } ) );
	ground.receiveShadow = true;
	textureLoader.load( "cobblestone.jpg", function( texture ) {
		texture.wrapS = THREE.RepeatWrapping;
		texture.wrapT = THREE.RepeatWrapping;
		texture.repeat.set( 40, 40 );
		ground.material.map = texture;
		ground.material.needsUpdate = true;
	} );

  // // Walls
  // pos.set(0, - 0.5, 0);
	// quat.set(0, 0, 0, 1);

	// Tower 1
	let towerMass = 1000;
	let towerHalfExtents = new THREE.Vector3( 2, 5, 2 );
	pos.set( -8, 5, 0 );
	quat.set( 0, 0, 0, 1 );
	createObject( towerMass, towerHalfExtents, pos, quat, createMaterial( 0xB03014 ) );
	// Tower 2
	pos.set( 8, 5, 0 );
	quat.set( 0, 0, 0, 1 );
	createObject( towerMass, towerHalfExtents, pos, quat, createMaterial( 0xB03214 ) );
	//Bridge
	let bridgeMass = 100;
	let bridgeHalfExtents = new THREE.Vector3( 7, 0.2, 1.5 );
	pos.set( 0, 10.2, 0 );
	quat.set( 0, 0, 0, 1 );
	createObject( bridgeMass, bridgeHalfExtents, pos, quat, createMaterial( 0xB3B865 ) );
	// Stones
	let stoneMass = 120;
	let stoneHalfExtents = new THREE.Vector3( 1, 2, 0.15 );
	let numStones = 8;
	quat.set( 0, 0, 0, 1 );
	for ( let i = 0; i < numStones; i++ ) {
		pos.set( 0, 2, 15 * ( 0.5 - i / ( numStones + 1 ) ) );
		createObject( stoneMass, stoneHalfExtents, pos, quat, createMaterial( 0xB0B0B0 ) );
	}
	// Mountain
	let mountainMass = 860;
	let mountainHalfExtents = new THREE.Vector3( 4, 5, 4 );
	pos.set( 5, mountainHalfExtents.y * 0.5, - 7 );
	quat.set( 0, 0, 0, 1 );
	let mountainPoints = [];
	mountainPoints.push( new THREE.Vector3( mountainHalfExtents.x, - mountainHalfExtents.y, mountainHalfExtents.z ) );
	mountainPoints.push( new THREE.Vector3( - mountainHalfExtents.x, - mountainHalfExtents.y, mountainHalfExtents.z ) );
	mountainPoints.push( new THREE.Vector3( mountainHalfExtents.x, - mountainHalfExtents.y, - mountainHalfExtents.z ) );
	mountainPoints.push( new THREE.Vector3( - mountainHalfExtents.x, - mountainHalfExtents.y, - mountainHalfExtents.z ) );
	mountainPoints.push( new THREE.Vector3( 0, mountainHalfExtents.y, 0 ) );
	let mountain = new THREE.Mesh( new THREE.ConvexBufferGeometry( mountainPoints ), createMaterial( 0xB03814 ) );
	mountain.position.copy( pos );
	mountain.quaternion.copy( quat );
	convexBreaker.prepareBreakableObject( mountain, mountainMass, new THREE.Vector3(), new THREE.Vector3(), true );
	createDebrisFromBreakableObject( mountain );
}

function createParalellepipedWithPhysics( sx, sy, sz, mass, pos, quat, material ) {
  let newBoxBufferGeometry = new THREE.BoxBufferGeometry( sx, sy, sz, 1, 1, 1 );
  let object = new THREE.Mesh(newBoxBufferGeometry, material);
	let shape = new Ammo.btBoxShape( new Ammo.btVector3( sx * 0.5, sy * 0.5, sz * 0.5 ) );
	shape.setMargin(margin);
	createRigidBody(object, shape, mass, pos, quat);
	return object;
}

function createDebrisFromBreakableObject(object) {
	object.castShadow = true;
	object.receiveShadow = true;
	let shape = createConvexHullPhysicsShape(object.geometry.attributes.position.array);
	shape.setMargin(margin);
	let body = createRigidBody(object, shape, object.userData.mass, null, null, object.userData.velocity, object.userData.angularVelocity);
	// Set pointer back to the three object only in the debris objects
	let btVecUserData = new Ammo.btVector3( 0, 0, 0 );
	btVecUserData.threeObject = object;
	body.setUserPointer(btVecUserData);
}

function removeDebris(object) {
	scene.remove(object);
	physicsWorld.removeRigidBody(object.userData.physicsBody);
}

function createConvexHullPhysicsShape( coords ) {
	let shape = new Ammo.btConvexHullShape();
	for ( let i = 0, il = coords.length; i < il; i+= 3 ) {
		tempBtVec3_1.setValue( coords[ i ], coords[ i + 1 ], coords[ i + 2 ] );
		let lastOne = ( i >= ( il - 3 ) );
		shape.addPoint( tempBtVec3_1, lastOne );
	}
	return shape;
}

function createRigidBody( object, physicsShape, mass, pos, quat, vel, angVel ) {
	if ( pos ) {
		object.position.copy( pos );
	}
	else {
		pos = object.position;
	}
	if ( quat ) {
		object.quaternion.copy( quat );
	}
	else {
		quat = object.quaternion;
	}
	let transform = new Ammo.btTransform();
	transform.setIdentity();
	transform.setOrigin( new Ammo.btVector3( pos.x, pos.y, pos.z ) );
	transform.setRotation( new Ammo.btQuaternion( quat.x, quat.y, quat.z, quat.w ) );
	let motionState = new Ammo.btDefaultMotionState( transform );
	let localInertia = new Ammo.btVector3( 0, 0, 0 );
	physicsShape.calculateLocalInertia( mass, localInertia );
	let rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, physicsShape, localInertia );
	let body = new Ammo.btRigidBody( rbInfo );
	body.setFriction( 0.5 );
	if ( vel ) {
		body.setLinearVelocity( new Ammo.btVector3( vel.x, vel.y, vel.z ) );
	}
	if ( angVel ) {
		body.setAngularVelocity( new Ammo.btVector3( angVel.x, angVel.y, angVel.z ) );
	}
	object.userData.physicsBody = body;
	object.userData.collided = false;
	scene.add( object );
	if ( mass > 0 ) {
		rigidBodies.push( object );
		// Disable deactivation
		body.setActivationState( 4 );
	}
	physicsWorld.addRigidBody( body );
	return body;
}

function createRandomColor() {
	return Math.floor( Math.random() * ( 1 << 24 ) );
}

function createMaterial( color ) {
	color = color || createRandomColor();
	return new THREE.MeshPhongMaterial( { color: color } );
}

function initInput() {
  //possibly add functionality to not throw a ball if you have dragged the mouse
	window.addEventListener('mouseup', onMouseUp, false);
  //window.addEventListener('mouseup', onMouseUp);
}

function onMouseUp(event) {
  mouseCoords.set(
    (event.clientX/WINDOW_WIDTH) * 2 - 1,
    -(event.clientY/WINDOW_HEIGHT) * 2 + 1
  );
  raycaster.setFromCamera(mouseCoords, camera);

  // Creates a ball and throws it
  throwBall();
}

function throwBall() {
  let ballBufferGeom = new THREE.SphereBufferGeometry( ballRadius, 14, 10 );
  let ball = new THREE.Mesh(ballBufferGeom, ballMaterial);
  ball.castShadow = true;
  ball.receiveShadow = true;

  let ballShape = new Ammo.btSphereShape(ballRadius);
  ballShape.setMargin(margin);

  pos.copy(raycaster.ray.direction);
  pos.add(raycaster.ray.origin);

  quat.set(0, 0, 0, 1);
  let ballBody = createRigidBody(ball, ballShape, ballMass, pos, quat);
  pos.copy(raycaster.ray.direction);
  pos.multiplyScalar(ballSpeed);

  let ballVelocity = new Ammo.btVector3( pos.x, pos.y, pos.z );
  ballBody.setLinearVelocity(ballVelocity);
}

// function onWindowResize() {
// 	camera.aspect = window.innerWidth / window.innerHeight;
// 	camera.updateProjectionMatrix();
// 	renderer.setSize( window.innerWidth, window.innerHeight );
// }

function animate() {
	requestAnimationFrame( animate );
	render();
	stats.update();
}

function render() {
	let deltaTime = clock.getDelta();
	updatePhysics(deltaTime);
	renderer.render(scene, camera);
	time += deltaTime;
}

function updatePhysics( deltaTime ) {
	// Step world
	physicsWorld.stepSimulation( deltaTime, 10 );

	// Update rigid bodies
	for ( let i = 0; i < rigidBodies.length; i++ ) {
		let objThree = rigidBodies[i];
		let objPhys = objThree.userData.physicsBody;
		let ms = objPhys.getMotionState();
		if (ms) {
			ms.getWorldTransform(transformAux1);
			let p = transformAux1.getOrigin();
			let q = transformAux1.getRotation();
			objThree.position.set( p.x(), p.y(), p.z() );
      //can we use position.copy(p) here instead?
			objThree.quaternion.set( q.x(), q.y(), q.z(), q.w() );
      //use quaternion.copy(q) instead?
			objThree.userData.collided = false;
		}
	}

	for ( let i = 0, il = dispatcher.getNumManifolds(); i < il; i ++ ) {
		let contactManifold = dispatcher.getManifoldByIndexInternal( i );
		let rb0 = Ammo.castObject( contactManifold.getBody0(), Ammo.btRigidBody );
		let rb1 = Ammo.castObject( contactManifold.getBody1(), Ammo.btRigidBody );
		let threeObject0 = Ammo.castObject( rb0.getUserPointer(), Ammo.btVector3 ).threeObject;
		let threeObject1 = Ammo.castObject( rb1.getUserPointer(), Ammo.btVector3 ).threeObject;

    if (!threeObject0 && !threeObject1) {
			continue;
		}

		let userData0 = threeObject0 ? threeObject0.userData : null;
		let userData1 = threeObject1 ? threeObject1.userData : null;
		let breakable0 = userData0 ? userData0.breakable : false;
		let breakable1 = userData1 ? userData1.breakable : false;
		let collided0 = userData0 ? userData0.collided : false;
		let collided1 = userData1 ? userData1.collided : false;

		if ( (!breakable0 && !breakable1) || (collided0 && collided1) ) {
			continue;
		}

		let contact = false;
		let maxImpulse = 0;
		for ( let j = 0, jl = contactManifold.getNumContacts(); j < jl; j ++ ) {
			let contactPoint = contactManifold.getContactPoint( j );

      if ( contactPoint.getDistance() < 0 ) {
				contact = true;

        let impulse = contactPoint.getAppliedImpulse();
				if ( impulse > maxImpulse ) {
					maxImpulse = impulse;
					let pos = contactPoint.get_m_positionWorldOnB();
					let normal = contactPoint.get_m_normalWorldOnB();
					impactPoint.set( pos.x(), pos.y(), pos.z() );
					impactNormal.set( normal.x(), normal.y(), normal.z() );
				}
				break;
			}
		}

		// If no point has contact, abort
		if (!contact) {
			continue;
		}

		// Subdivision
		let fractureImpulse = 150;
		if (breakable0 && !collided0 && maxImpulse > fractureImpulse) {
			let debris = convexBreaker.subdivideByImpact(threeObject0, impactPoint, impactNormal, 1, 2, 1.5);
			//let numObjects = debris.length;
			for (let j = 0, jl = debris.length; j < jl; j++ ) {
				let vel = rb0.getLinearVelocity();
				let angVel = rb0.getAngularVelocity();
				let fragment = debris[ j ];
				fragment.userData.velocity.set( vel.x(), vel.y(), vel.z() );
				fragment.userData.angularVelocity.set( angVel.x(), angVel.y(), angVel.z() );
				createDebrisFromBreakableObject(fragment);
			}
      numObjectsToRemove++;
			objectsToRemove[numObjectsToRemove] = threeObject0;
			userData0.collided = true;
		}

		if ( breakable1 && !collided1 && maxImpulse > fractureImpulse ) {
			let debris = convexBreaker.subdivideByImpact( threeObject1, impactPoint, impactNormal , 1, 2, 1.5 );
			let numObjects = debris.length;
			for ( let j = 0; j < numObjects; j++ ) {
				let vel = rb1.getLinearVelocity();
				let angVel = rb1.getAngularVelocity();
				let fragment = debris[ j ];
				fragment.userData.velocity.set( vel.x(), vel.y(), vel.z() );
				fragment.userData.angularVelocity.set( angVel.x(), angVel.y(), angVel.z() );
				createDebrisFromBreakableObject( fragment );
			}
      numObjectsToRemove++;
			objectsToRemove[numObjectsToRemove] = threeObject1;
			userData1.collided = true;
		}
	}

	// for ( let i = 0; i < numObjectsToRemove; i++ ) {
	// 	removeDebris(objectsToRemove[i]);
	// }
  removeAllDebris(objectsToRemove, numObjectsToRemove);
	numObjectsToRemove = 0;
}

function removeAllDebris(objectsToRemove, numObjectsToRemove) {
  for (let i = 0; i < numObjectsToRemove; i++) {
    removeDebris(objectsToRemove[i]);
  }
}
*/
