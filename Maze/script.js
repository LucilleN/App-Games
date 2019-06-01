const WINDOW_WIDTH = window.innerWidth;
const WINDOW_HEIGHT = window.innerHeight;

const MAZE_LENGTH = 44;
const MAZE_WIDTH = 50;

const WALL_WIDTH = 3.5;
const BALL_DIAMETER = 2;
const BALL_RADIUS = BALL_DIAMETER/2;

//Shouldn't need this at all after we get wall collisions right and mouse drag right
const BALL_SPEED_TEMP = 0.25;

//Set up the WebGL renderer
let renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(WINDOW_WIDTH, WINDOW_HEIGHT);
renderer.setClearColor(0xDDDDDD, 1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

//Set up the scene
let scene = new THREE.Scene();

let camera = new THREE.PerspectiveCamera(70, WINDOW_WIDTH/WINDOW_HEIGHT);
camera.position.set(0, 50, 40);
camera.rotation.set(-1, 0, 0);
scene.add(camera);

let light = new THREE.PointLight(0xFFFFFF, 4, 100);
light.position.set(0, 50, 10);
light.castShadow = true;
scene.add(light);

//Raycaster to be used later for selecting the ball with a mouse/touch
let raycaster = new THREE.Raycaster();

//Enable renderer window resizing
THREEx.WindowResize(this.renderer, this.camera);

//Create the floor of the maze
let floorGeometry = new THREE.BoxGeometry(MAZE_WIDTH, 1, MAZE_LENGTH);
let floorMaterial = new THREE.MeshLambertMaterial({color: 0x0095DD});
let floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.position.set(0, -1, 0);
scene.add(floor);

const WALL_MATERIAL = new THREE.MeshLambertMaterial({color: 0xFFFFFF});

//Class for maze walls that maintains each wall's dimensions, geometry, material, and mesh.
class Wall {

  constructor(length = MAZE_WIDTH, height = WALL_WIDTH, width = WALL_WIDTH) {
    this.length = length;
    this.height = height;
    this.width = width;

    this.geometry = new THREE.BoxGeometry(length, height, width);
    this.material = WALL_MATERIAL;
    this.mesh = new THREE.Mesh(this.geometry, this.material);
  }

  // checkCollision(ballDirection) {
  //   let distBtwnCenters = (ballDirection === "up" || ballDirection == "down") ? BALL_RADIUS + this.width/2 : BALL_RADIUS + this.length/2;
  //   if (ballDirection === "up") {
  //     if ((ball.position.z - this.mesh.position.z) <= distBtwnCenters) {
  //       console.log("upward collision detected");
  //       return true;
  //     }
  //   } else if (ballDirection === "down") {
  //     if ((this.mesh.position.z - ball.position.z) <= distBtwnCenters) {
  //       console.log("downward collision detected");
  //       return true;
  //     }
  //   } else if (ballDirection === "left") {
  //     if (Math.abs(ball.position.x - this.mesh.position.x) <= distBtwnCenters) {
  //       console.log("left collision detected");
  //       return true;
  //     }
  //   } else if (ballDirection === "right") {
  //     if (Math.abs(this.mesh.position.x - ball.position.x) <= distBtwnCenters) {
  //       console.log("right collision detected");
  //       return true;
  //     }
  //   }
  //   return false;
  // }



  // checkHorizontalCollision(ballDirection) {
  //   let distBtwnCenters = BALL_RADIUS + this.length/2;
  //   if (ballDirection === "left") {
  //     if (Math.abs(ball.position.x - this.mesh.position.x) <= distBtwnCenters) {
  //       console.log("left collision detected");
  //       return true;
  //     }
  //   } else if (ballDirection === "right") {
  //     if (Math.abs(this.mesh.position.x - ball.position.x) <= distBtwnCenters) {
  //       console.log("right collision detected");
  //       return true;
  //     }
  //   }
  //   return false;
  // }

}

//Fill array of all walls
let walls = [
  //Outer Walls
  new Wall(MAZE_WIDTH, WALL_WIDTH, WALL_WIDTH),
  new Wall(WALL_WIDTH, WALL_WIDTH, MAZE_LENGTH),
  new Wall(MAZE_WIDTH, WALL_WIDTH, WALL_WIDTH),
  new Wall(WALL_WIDTH, WALL_WIDTH, MAZE_LENGTH)
]
let innerWallLength = MAZE_WIDTH - WALL_WIDTH*2 - BALL_DIAMETER; //- 25; //get rid of this later
//Inner Walls
for (let i = 0; i < 4; i++) {
  walls.push(new Wall(innerWallLength, WALL_WIDTH, WALL_WIDTH));
}

//Add the wall objects to the scene
walls.forEach(wall => scene.add(wall.mesh));

//Position the outer walls
let wallOffset = WALL_WIDTH/2;
walls[0].mesh.position.set(0, 0, MAZE_LENGTH/2 - wallOffset);
walls[1].mesh.position.set(MAZE_WIDTH/2 - wallOffset, 0, 0);
walls[2].mesh.position.set(0, 0, -(MAZE_LENGTH/2 - wallOffset));
walls[3].mesh.position.set(-(MAZE_WIDTH/2 - wallOffset), 0, 0);
//Position the inner walls. I know, hard-coded, big uggo, fix later
walls[4].mesh.position.set(WALL_WIDTH, 0, 12);
walls[5].mesh.position.set(-WALL_WIDTH, 0, 4);
walls[6].mesh.position.set(-WALL_WIDTH, 0, -12);
walls[7].mesh.position.set(WALL_WIDTH, 0, -4);

//Create the player's ball
let ballGeometry = new THREE.SphereGeometry(BALL_RADIUS, 16, 12);
let ballMaterial = new THREE.MeshLambertMaterial({color: 0xAD0363});
let ball = new THREE.Mesh(ballGeometry, ballMaterial);
ball.position.set(-(MAZE_WIDTH/2-WALL_WIDTH*1.5) + 1, 0, -(MAZE_LENGTH/2-WALL_WIDTH*1.5) + 1);
//REMOVE LATER
//ball.position.set(15, 0, 15);
scene.add(ball);

//Create the goal cube
let goalGeometry = new THREE.BoxGeometry(2, 2, 2);
let goalMaterial = new THREE.MeshLambertMaterial({color: 0x80F442});
let goal = new THREE.Mesh(goalGeometry, goalMaterial);
goal.position.set(MAZE_WIDTH/2-WALL_WIDTH*1.75, 1.5, MAZE_LENGTH/2-WALL_WIDTH*1.75);
scene.add(goal);

goal.isGoal = true;

let collidableMeshes = walls.map(wall => wall.mesh);
collidableMeshes.push(goal);

let leftPressed = false;
let rightPressed = false;
let upPressed = false;
let downPressed = false;

document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);

function onKeyDown(e) {
  switch (e.keyCode) {
    case 37:
        leftPressed = true;
        break;
    case 38:
        upPressed = true;
        break;
    case 39:
        rightPressed = true;
        break;
    case 40:
        downPressed = true;
        break;
  }
}

function onKeyUp(e) {
  switch (e.keyCode) {
    case 37:
        leftPressed = false;
        break;
    case 38:
        upPressed = false;
        break;
    case 39:
        rightPressed = false;
        break;
    case 40:
        downPressed = false;
        break;
  }
}

//document.addEventListener('mousedown', this.onDocumentMouseDown, false);
//document.addEventListener('mousemove', this.onDocumentMouseMove, false);
//document.addEventListener('mouseup', this.onDocumentMouseUp, false);

let mouse = { x: 0, y: 0 };
let ballSelected = false;

let plane = new THREE.Mesh(new THREE.PlaneBufferGeometry(500, 500, 8, 8), new THREE.MeshBasicMaterial({color: 0xffffff}));
plane.visible = false;
scene.add(plane);
let offset = new THREE.Vector3();

// mouse.prevX = 0;
// mouse.prevY = 0;
function onDocumentMouseDown(event) {
  mouse.prevX = mouse.x;
  mouse.prevY = mouse.y;
  mouse.x = event.clientX// / WINDOW_WIDTH;
  console.log(event.clientX);
  //console.log(WINDOW_WIDTH);
  console.log(mouse.x);
  mouse.y = event.clientY / window.innerHeight;

  //stuff required for raycasting, probably shouldn't change
  let mouseX = (event.clientX / window.innerWidth) * 2 - 1;
  let mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
  let vector = new THREE.Vector3(mouseX, mouseY, 1);
  vector.unproject(camera);

  raycaster.set(camera.position, vector.sub(camera.position).normalize());
  let intersections = raycaster.intersectObject(ball);
  if (intersections.length > 0) {
    ballSelected = true;
    console.log("ball selected!");
  }
  //let intersects = raycaster.intersectObject(plane);
  //offset.copy(intersects[0].point).sub(plane.position);

}

/*
function onDocumentMouseMove(event) {
  if (!ballSelected) {
    return;
  }
  event.preventDefault();
  let prevMouseX = mouse.x;
  let prevMouseY = mouse.y;
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  scene.updateMatrixWorld(true);
  let prevBallPosition = new THREE.Vector3();
  prevBallPosition.setFromMatrixPosition(ball.matrixWorld);
  console.log(prevBallPosition);

  let prevBallX = ball.position.x;
  let prevBallZ = ball.position.z;

  // ball.position.set(prevBallPosition.x + (mouse.x - prevMouseX)), 0, prevBallPosition.z + (mouse.y - prevMouseY);
  // ball.position.set(prevBallX + (mouse.x - prevMouseX)), 0, prevBallZ + (mouse.y - prevMouseY);
  ball.position.set(prevBallX + 1, 5, 5);

  renderGame();
  // let vector = new THREE.Vector3(mouse.x, mouse.y, 1);
  // console.log(vector);
  // //vector.unproject(camera);
  // //console.log(vector);
  // raycaster.set(camera.position, vector.sub(camera.position).normalize());
  // if (ballSelected) {
  //   //let intersects = raycaster.intersectObject(plane);
  //   //console.log(intersects);
  //   // ball.position.copy(intersects[0].point.sub(offset));
  //   ball.position.copy(vector);
  //   console.log("ball.position:" + ball.x + ", " + ball.y + ", " + ball.z);
  // }

  //ball.position.set(0, 0, 0);
}
*/

function onDocumentMouseUp(event) {
  ballSelected = false;
}

function checkAllWalls(ballDirection) {
  // if (ballDirection === "up" || ballDirection === "down") {
  //   for (let i = 0; i < walls.length; i++) {
  //     if (walls[i].checkVerticalCollision(ballDirection)) {
  //       return true;
  //     }
  //   }
  // } else if (ballDirection === "left" || ballDirection === "right") {
  //   for (let i = 0; i < walls.length; i++) {
  //     if (walls[i].checkHorizontalCollision(ballDirection)) {
  //       return true;
  //     }
  //   }
  // }

  for (let i = 0; i < walls.length; i++) {
    if (walls[i].checkCollision(ballDirection)) {
      return true;
    }
  }
  return false;

}

function checkCollisionWithRays(ballDirection) {
  let originPoint = ball.position.clone();

  for (let vertexIndex = 0; vertexIndex < ball.geometry.vertices.length; vertexIndex++) {
    let localVertex = ball.geometry.vertices[vertexIndex].clone();
    let globalVertex = localVertex.applyMatrix4(ball.matrix);
    let directionVector = globalVertex.sub(ball.position);

    let ray = new THREE.Raycaster(originPoint, directionVector.clone().normalize());
    let collisionResults = ray.intersectObjects(collidableMeshes/*walls.map(wall => wall.mesh)*/);

    if (collisionResults.length > 0 && collisionResults[0].distance < directionVector.length()) {
      console.log("COLLISION");
      //let difference = collisionResults[0].distance - directionVector.length();
      //moveInOppositeDir(difference, ballDirection);
      return collisionResults[0];
    }
  }
}

//Tried to use this to avoid jitter. Didn't work, so I just flipped the dx/dz to at least have it bounce back a little
function moveInOppositeDir(distance, ballDirection) {
  distance++;
  switch (ballDirection) {
    case "up":
      ball.position.z += distance;
      break;
    case "down":
      ball.position.z -= distance;
      break;
    case "left":
      ball.position.x += distance;
      break;
    case "right":
      ball.position.x -= distance;
      break;
  }
}

function updateBallPosition() {
  let prevBallX = ball.position.x;
  let prevBallZ = ball.position.z;

  let dx = 0;
  let dz = 0;

  if (leftPressed /*&& !checkAllWalls("left")*/) {
    dx += -BALL_SPEED_TEMP;
  }
  if (rightPressed /*&& !checkAllWalls("right")*/) {
    dx += BALL_SPEED_TEMP;
  }
  if (upPressed /*&& !checkAllWalls("up")*/) {
    dz += -BALL_SPEED_TEMP;
  }
  if (downPressed /*&& !checkAllWalls("down")*/) {
    dz += BALL_SPEED_TEMP;
  }

  let collidedWith = checkCollisionWithRays();
  if (collidedWith) {
    if (leftPressed || rightPressed) {
      dx = -dx;
    } else if (upPressed || downPressed) {
      dz = -dz;
    }
    console.log(collidedWith);
    if (collidedWith.object.isGoal) {
      console.log("GOAL!");
    }
  }

  ball.position.set(prevBallX + dx, 0, prevBallZ + dz);

  //Also tried again here to stop the jittering, but this was a really bad idea and it gave me an infinite loop lol
  // while (checkCollisionWithRays()) {
  //   if (leftPressed) {
  //     ball.position.x++;
  //   } else if (rightPressed) {
  //     ball.position.x--;
  //   } else if (upPressed) {
  //     ball.position.z++;
  //   } else if (downPressed) {
  //     ball.position.z--;
  //   }
  // }

  //Another try at dragging stuff
  // if (ballSelected) {
  //   scene.updateMatrixWorld(true);
  //   let prevBallPosition = new THREE.Vector3();
  //   prevBallPosition.setFromMatrixPosition(ball.matrixWorld);
  //   //console.log(prevBallPosition);
  //
  //   let prevBallX = ball.position.x;
  //   let prevBallZ = ball.position.z;
  //
  //   let xDist = (mouse.x - prevBallX) * 0.1;
  //   let zDist = (mouse.y - prevBallZ) * 0.1;
  //
  //   ball.position.set(prevBallX + xDist, 0, prevBallZ + zDist);
  // }
}

function renderGame() {
  requestAnimationFrame(renderGame);
  renderer.render(scene, camera);
  // if (ballSelected) {
  //   updateBallPosition();
  // }
  updateBallPosition();
}

renderGame();
