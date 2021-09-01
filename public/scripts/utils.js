const mat4 = glMatrix.mat4;
let playing = false;
const sys = new System();
const drag = {
    isDown: false,
    fromY: 0,
    fromX: 0,
    draggedY: 0,
    draggedX: 0,
    currentY: 0,
    currentX: 0,
};
let activeCamera = -1;
let camera = {
    x: 0,
    y: 0,
    z: 10,
    pitch: 0,
    yaw: 0,
    roll: 0,
    speed: .05,
    scrollSpeed: .6,
};
const ui = {
    pressedKeys: {},
};
const canvas = document.getElementById('gameviewer');
canvas.focus();
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;
/** @type {WebGLRenderingContext} */
const gl = canvas.getContext('webgl2');
if (gl === null) { alert("Unable to initialize WebGL."); }
(async () => {
    let Objects = await fetch('/api/getFiles').then((res) => res.json());
    for (object of Objects) {
        if (object.Type === 'GameObject') {
            let transform = new Transform();
            transform.setTransform(object.Properties.Transform);
            transform.setScale([...object.Properties.Scale, 1]);
            transform.setDefaultScale([...object.Properties.DefaultScale, 1]);
            new GameObject(transform, sys, object.Name, object.Properties.TextureID, object.Properties.Color);
        } else if (object.Type === 'Player') {
            let transform = new Transform();
            transform.setTransform(object.Properties.Transform);
            transform.setScale([...object.Properties.Scale, 1]);
            transform.setDefaultScale([...object.Properties.DefaultScale, 1]);
            let player = new Player(transform, sys, object.Name, object.Properties.TextureID, object.Properties.Color);
            player.addComponent(new CameraComponent('camera', player, ui));
            player.addComponent(new ColliderComponent('collider', player));
            if (object.Properties.AnimationJson !== 'none' && object.Properties.Texture !== 'none') {
                player.addComponent(new SpriteComponent('sprite', player, `./images/${object.Properties.Texture}`, `./data/states/${object.Properties.AnimationJson}.json`));
                player.addComponent(new ScriptComponent('script', player));
                //Test Script, Dynamic Scripting needs to be added
                let stateScript = new Script(player);
                (async () => {
                    stateScript.run = new Function(await fetch('../data/scripts/ChangeAnimation.js').then(res => res.text()));
                })().then(() => {
                    stateScript.run();
                    player.getComponent('script').script = stateScript;
                });
            }
        }
    }
    updateInfo();
})();

const renderer = new Renderer(gl, sys);
renderer.init();

function getJSON(path) {
    return fetch(path).then(response => response.json());
}

function crossVec3(vec3a, vec3b) {
    let vec3r = [];
    vec3r[0] = vec3a[1] * vec3b[2] - vec3a[2] * vec3b[1];
    vec3r[1] = vec3a[2] * vec3b[0] - vec3a[0] * vec3b[2];
    vec3r[2] = vec3a[0] * vec3b[1] - vec3a[1] * vec3b[0];
    let glVec3 = glMatrix.vec3.fromValues(vec3r[0], vec3r[1], vec3r[2]);
    glMatrix.vec3.normalize(glVec3, glVec3);
    return [glVec3[0], glVec3[1], glVec3[2]];
}

function sizeOf(data, size = 0) {
    for (let obj in data) {
        let value = data[obj];
        if (typeof value === 'boolean') {
            size += 1;
        } else if (typeof value === 'string') {
            size += value.length * 2;
        } else if (typeof value === 'number') {
            size += 4;
        } else {
            let oldSize = size;
            size += sizeOf(value, oldSize) - oldSize;
        }
    }

    return size;
}

function loadTexture(url, id) {
    const texture = gl.createTexture();
    const image = new Image();
    image.onload = e => {
        gl.activeTexture(gl.TEXTURE0 + id);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
    };
    image.src = url;
    return texture;
}

function hexToRgb(hex) {
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function (m, r, g, b) {
        return r + r + g + g + b + b;
    });
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function rgbArrayToHex(array) {
    r = parseInt(array[0] * 255);
    g = parseInt(array[1] * 255);
    b = parseInt(array[2] * 255);
    return rgbToHex(r, g, b);
}

function Vertex() {
    this.position = [0, 0, 0];
    this.color = [0, 0, 0, 0];
    this.texCoords = [0, 0];
    this.texId = 0;
}

function mulVec3(vec1, vec2) {
    return [vec1[0] * vec2[0], vec1[1] * vec2[1], vec1[2] * vec2[2]];
}

function Transform() {
    this.translation = [0, 0, 0, 1];
    this.scale = [1, 1, 1]
    this.normalizedScale = [1, 1, 1];
    this.getActualScale = () => { return mulVec3(this.scale, this.normalizedScale) };
    this.rotation = 0;
    this.mat = getTransform(this.translation, this.rotation, mulVec3(this.scale, this.normalizedScale));
    this.updateMat = () => {
        this.mat = getTransform(this.translation, this.rotation, mulVec3(this.scale, this.normalizedScale));
    }
    this.setTransform = (xyz) => {
        this.translation[0] = xyz[0]
        this.translation[1] = xyz[1]
        this.translation[2] = xyz[2]
        this.updateMat();
    }
    this.setDefaultScale = (xyz) => {
        this.normalizedScale[0] = xyz[0]
        this.normalizedScale[1] = xyz[1]
        this.normalizedScale[2] = xyz[2]
        this.updateMat();
    }
    this.setX = (x) => {
        this.translation[0] = x;
        this.updateMat();
    }
    this.setY = (y) => {
        this.translation[1] = y;
        this.updateMat();
    }
    this.setZ = (z) => {
        this.translation[2] = z;
        this.updateMat();
    }
    this.setScale = (scale) => {
        this.scale = scale;
        this.updateMat();
    }
    this.setScaleX = (scale) => {
        this.scale[0] = scale;
        this.updateMat();
    }
    this.setScaleY = (scale) => {
        this.scale[1] = scale;
        this.updateMat();
    }
    this.setScaleZ = (scale) => {
        this.scale[2] = scale;
        this.updateMat();
    }
    this.setRotation = (r) => {
        this.rotation = r;
        this.updateMat();
    }
    this.normalize = () => {
        this.normalizedScale = addVec3(this.normalizedScale, this.scale);
        this.scale = [1, 1, 1];
    }
    this.getX = () => {
        return this.translation[0];
    }
    this.getY = () => {
        return this.translation[1];
    }
    this.getZ = () => {
        return this.translation[2];
    }
    this.getRotation = () => {
        return this.rotation;
    }
    this.getScale = () => {
        return this.scale;
    }
}

function mulMat3(mat, vec) {
    let x = (vec[0] * mat[0]) + (vec[1] * mat[4]) + (vec[2] * mat[8]) + (vec[3] * mat[12]);
    let y = (vec[0] * mat[1]) + (vec[1] * mat[5]) + (vec[2] * mat[9]) + (vec[3] * mat[13]);
    let z = (vec[0] * mat[2]) + (vec[1] * mat[6]) + (vec[2] * mat[10]) + (vec[3] * mat[14]);
    let w = (vec[0] * mat[3]) + (vec[1] * mat[7]) + (vec[2] * mat[11]) + (vec[3] * mat[15]);
    return [x, y, z, w];
}

function getTransform(tran, rad, scale) {
    let mat = glMatrix.mat4.create();
    glMatrix.mat4.translate(mat, mat, tran);
    glMatrix.mat4.rotateZ(mat, mat, rad * Math.PI / 180);
    glMatrix.mat4.scale(mat, mat, scale);
    return mat;
}

function createQuad(x, y, color, id, rad = 0, scale = [1, 1, 1]) {
    let vectors = [];
    let v0 = new Vertex();
    let v1 = new Vertex();
    let v2 = new Vertex();
    let v3 = new Vertex();

    v0.position = mulMat3(getTransform([x, y, 0], rad, scale), [-.5, -.5, 0.0, 1]);
    v0.color = color;
    v0.texCoords = [1.0, 1.0];
    v0.texId = id;
    vectors.push(v0);


    v1.position = mulMat3(getTransform([x, y, 0], rad, scale), [0.5, -.5, 0.0, 1]);
    v1.color = color;
    v1.texCoords = [0.0, 1.0];
    v1.texId = id;
    vectors.push(v1);


    v2.position = mulMat3(getTransform([x, y, 0], rad, scale), [.5, .5, 0.0, 1]);
    v2.color = color;
    v2.texCoords = [0.0, 0.0];
    v2.texId = id;
    vectors.push(v2);


    v3.position = mulMat3(getTransform([x, y, 0], rad, scale), [-.5, .5, 0.0, 1]);
    v3.color = color;
    v3.texCoords = [1.0, 0.0];
    v3.texId = id;
    vectors.push(v3);

    let vecs = [];
    for (let vec of vectors) {
        vecs.push(...vec.position, ...vec.color, ...vec.texCoords, vec.texId);
    }
    return vecs;
}

function createQuadFromTransform(transform, color, id) {
    let vectors = [];
    let v0 = new Vertex();
    let v1 = new Vertex();
    let v2 = new Vertex();
    let v3 = new Vertex();

    v0.position = mulMat3(transform, [-.5, -.5, 0.0, 1]);
    v0.color = color;
    v0.texCoords = [0.0, 1.0];
    v0.texId = id;
    vectors.push(v0);


    v1.position = mulMat3(transform, [0.5, -.5, 0.0, 1]);
    v1.color = color;
    v1.texCoords = [1.0, 1.0];
    v1.texId = id;
    vectors.push(v1);


    v2.position = mulMat3(transform, [.5, .5, 0.0, 1]);
    v2.color = color;
    v2.texCoords = [1.0, 0.0];
    v2.texId = id;
    vectors.push(v2);


    v3.position = mulMat3(transform, [-.5, .5, 0.0, 1]);
    v3.color = color;
    v3.texCoords = [0.0, 0.0];
    v3.texId = id;
    vectors.push(v3);

    let vecs = [];
    for (let vec of vectors) {
        vecs.push(...vec.position, ...vec.color, ...vec.texCoords, vec.texId);
    }
    return vecs;
}

function createQuadWithImage(transform, color, id, image, pos) {
    let maxWidth = image.width;
    let maxHeight = image.height;
    let uvXHigh = parseInt(pos.offsetX) / maxWidth;
    let uvYLow = parseInt(pos.offsetY) / maxHeight;
    let uvXLow = (parseInt(pos.offsetX) + parseInt(pos.width)) / maxWidth;
    let uvYHigh = (parseInt(pos.offsetY) + parseInt(pos.height)) / maxHeight;

    let vectors = [];
    let v0 = new Vertex();
    let v1 = new Vertex();
    let v2 = new Vertex();
    let v3 = new Vertex();

    v0.position = mulMat3(transform, [-.5, -.5, 0.0, 1]);
    v0.color = color;
    v0.texCoords = [uvXHigh, uvYHigh];
    v0.texId = id;
    vectors.push(v0);


    v1.position = mulMat3(transform, [0.5, -.5, 0.0, 1]);
    v1.color = color;
    v1.texCoords = [uvXLow, uvYHigh];
    v1.texId = id;
    vectors.push(v1);


    v2.position = mulMat3(transform, [.5, .5, 0.0, 1]);
    v2.color = color;
    v2.texCoords = [uvXLow, uvYLow];
    v2.texId = id;
    vectors.push(v2);


    v3.position = mulMat3(transform, [-.5, .5, 0.0, 1]);
    v3.color = color;
    v3.texCoords = [uvXHigh, uvYLow];
    v3.texId = id;
    vectors.push(v3);

    let vecs = [];
    for (let vec of vectors) {
        vecs.push(...vec.position, ...vec.color, ...vec.texCoords, vec.texId);
    }
    return vecs;
}

function selectFolder(event) {
    const file = event.target.files[0];
    localStorage.setItem(file.name, file);
}