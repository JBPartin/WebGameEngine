class System {
    constructor() {
        this.entities = [];
        this.addEntity = (ent) => {
            this.entities.push(ent);
        }
        this.getEntity = (i) => {
            return this.entities[i];
        }
        this.removeEntity = (ent) => {
            let index = this.entities.indexOf(ent);
            this.entities.splice(index, 1);
        }
        this.update = () => {
            for (let ent of this.entities) {
                ent.update();
            }
        }
    }
}

class Entity {
    constructor(transform, system) {
        this.id = system.entities.length;
        system.addEntity(this);
        this.forwardVector = [0, 0, 0];
        this.transform = transform;
        this.positions = [];
        this.components = {};
        this.system = system;
        this.canCollide = true;
        this.texCoord = 0;
        this.color = [0, 0, 0, 0];
        this.normalizedScale = [0, 0];
        this.destroy = () => {
            this.system.removeEntity(this);
        }
        this.update = () => {
            for (let name of Object.keys(this.components)) {
                this.components[name].update(this);
            }
        };
        this.addComponent = (component) => {
            this.components[component.name] = component;
        };
        this.removeComponent = (name) => {
            delete this.components[name];
        };
        this.getComponent = (name) => {
            return this.components[name];
        };
        this.getVerts = () => {
            this.system.update();
            this.verts = (createQuadFromTransform(this.transform.mat, this.color, this.texCoord));
            return this.verts;
        }
        this.getVertsWithSprite = (image, pos) => {
            this.system.update();
            this.verts = (createQuadWithImage(this.transform.mat, this.color, this.texCoord, image, pos));
            return this.verts;
        }
        this.draw = (gl, images, positionBuffer, programInfo) => {
            gl.activeTexture(gl.TEXTURE0 + this.texCoord)
            gl.bindTexture(gl.TEXTURE_2D, images[this.texCoord]);
            gl.uniform1i(programInfo.uniformLocations.textureID, this.texCoord);
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.getVerts()), gl.DYNAMIC_DRAW);
            gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
        };
        this.drawAnim = (gl, images, positionBuffer, programInfo, pos, image) => {
            gl.activeTexture(gl.TEXTURE0 + this.texCoord)
            gl.bindTexture(gl.TEXTURE_2D, images[this.texCoord]);
            gl.uniform1i(programInfo.uniformLocations.textureID, this.texCoord);
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.getVertsWithSprite(image, pos)), gl.DYNAMIC_DRAW);
            gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
        };
    }
}
class Component {
    constructor(name, entity) {
        this.name = name;
        this.entity = entity;
        this.update = (ent) => { };
    }
}
class Script {
    #entity;
    #run;
    constructor(entity) {
        this.#entity = entity;
        this.#run = () => { };
        this.globals = { x: 0 };
    }
    set onStart(start = () => { }) {
        if (typeof start !== 'function')
            throw Error('onStart variable is not a function!');
        else {
            start();
        }
    }
    set onUpdate(update = () => { }) {
        if (typeof update !== 'function')
            throw Error('onUpdate variable is not a function!');
        else
            setInterval(() => {
                if (playing)
                    update();
            }, 1);
    }
    set onMouseDown(click = () => { }) {
        if (typeof click !== 'function')
            throw Error('onClick variable is not a function!');
        else
            window.addEventListener('mousedown', () => {
                if (playing)
                    click();
            });
    }
    set onMouseUp(click = () => { }) {
        if (typeof click !== 'function')
            throw Error('onClick variable is not a function!');
        else
            window.addEventListener('mouseup', () => {
                if (playing)
                    click();
            });
    }
    set onClick(click = () => { }) {
        if (typeof click !== 'function')
            throw Error('onClick variable is not a function!');
        else
            window.addEventListener('click', () => {
                if (playing)
                    click();
            });
    }
    get getSpriteData() {
        if (!this.#entity.getComponent('sprite'))
            throw Error('Entity does not have a sprite');
        return {
            getState: this.#entity.getComponent('sprite').getState,
            getSpeed: this.#entity.getComponent('sprite').speed,
        }
    }
    get getPressedKeys() {
        return ui.pressedKeys;
    }
    set setSpriteSpeed(setter) {
        if (!this.#entity.getComponent('sprite'))
            throw Error('Entity does not have a sprite');
        else
            this.#entity.getComponent('sprite').speed = setter;
    }
    get spawnObject() {
        return new GameObject(new Transform(), this.#entity.system, 'SpawnedObject');
    }

    set setSpriteState(setter) {
        if (!this.#entity.getComponent('sprite'))
            throw Error('Entity does not have a sprite');
        else
            this.#entity.getComponent('sprite').setState(setter);
    }
    //temporary
    get getTransform() {
        return this.#entity.getComponent('transform');
    }
    //temporary
    get getTexture() {
        return this.#entity.getComponent('texture');
    }
}
class SpriteComponent extends Component {
    constructor(name, entity, sheeturl, jsonurl) {
        super(name, entity);
        this.animations = [];
        this.state = 0;
        this.index = 0;
        this.speed = .05;
        this.image = undefined;
        this.entity.draw = (gl, images, pos, info) => { this.animate(gl, images, pos, info); }
        this.setAnimations(sheeturl, jsonurl);
    }
    get getState() {
        return this.state;
    }
    setState(num) {
        this.index = 0;
        this.state = Math.max(0, Math.min(num, this.animations.length));
    }
    animate(gl, images, pos, info) {
        if (this.animations[this.state]) {
            let index = Math.floor(this.index) % Object.keys(this.animations[this.state]).length;
            this.entity.drawAnim(gl, images, pos, info, this.animations[this.state][index], this.image);
            this.index += Math.max(0, Math.min(1, this.speed));
        } else {
            console.log('Texture Loading');
        }
    }
    setAnimations(sheetUrl, json) {
        this.image = new Image();
        this.image.src = sheetUrl;
        getJSON(json).then(info => {
            for (let state of Object.keys(info)) {
                this.animations.push(info[state]);
            }
        });
    }

}
class TextureComponent extends Component {
    constructor(name, entity) {
        super(name, entity);
        this.textureID = this.entity.texCoord;
        this.color = this.entity.color;
        this.setColor = (r, g, b, a) => {
            this.color = [r, g, b, a];
            this.update();
        }
        this.setColorArray = (color) => {
            this.color = color;
            this.update();
        }
        this.setColorRed = (r) => {
            this.color[0] = r;
            this.update();
        }
        this.setColorGreen = (g) => {
            this.color[1] = g;
            this.update();
        }
        this.setColorBlue = (b) => {
            this.color[2] = b;
            this.update();
        }
        this.setColorAlpha = (a) => {
            this.color[3] = a;
            this.update();
        }
        this.setTextureID = (id) => {
            this.textureID = id;
            this.update();
        }
        this.getTextureID = () => {
            return this.textureID;
        }
        this.getColor = () => {
            return this.color;
        }
        this.getColorRed = () => {
            return this.color[0];
        }
        this.getColorBlue = () => {
            return this.color[1];
        }
        this.getColorGreen = () => {
            return this.color[2];
        }
        this.getColorAlpha = () => {
            return this.color[3];
        }
        this.update = () => {
            this.entity.texCoord = this.textureID;
            this.entity.color = this.color;
        }
    }
}
class ColliderComponent extends Component {
    constructor(name, entity) {
        super(name, entity);
        this.isColliding = false;
        this.colliding = undefined;
        this.update = () => {
            for (let ent of this.entity.system.entities) {
                if (ent != this.entity) {
                    let entScale = ent.transform.getActualScale();
                    let thisEntScale = this.entity.transform.getActualScale();
                    let lowX = (ent.transform.getX() - Math.abs(entScale[0] / 2));
                    let highX = (ent.transform.getX() + Math.abs(entScale[0] / 2));
                    let lowY = (ent.transform.getY() - Math.abs(entScale[1] / 2));
                    let highY = (ent.transform.getY() + Math.abs(entScale[1] / 2));
                    let lowX2 = ((this.entity.transform.getX() + this.entity.forwardVector[0]) - Math.abs(thisEntScale[0] / 2));
                    let highX2 = ((this.entity.transform.getX() + this.entity.forwardVector[0]) + Math.abs(thisEntScale[0] / 2));
                    let lowY2 = ((this.entity.transform.getY() + this.entity.forwardVector[1]) - Math.abs(thisEntScale[1] / 2));
                    let highY2 = ((this.entity.transform.getY() + this.entity.forwardVector[1]) + Math.abs(thisEntScale[1] / 2));
                    if ((highX2 > lowX && lowX2 < highX) | (lowX2 < highX && highX2 > lowX)) {
                        if ((highY2 > lowY && lowY2 < highY) | (lowY2 < highY && lowY2 > lowY) && (this.entity.transform.getZ() === ent.transform.getZ())) {
                            if (!this.isColliding) {
                                this.colliding = ent;
                                this.isColliding = true;
                                break;
                            }
                        } else this.isColliding = false;
                    } else this.isColliding = false;
                }
            }
        };

    }
}
class TransformComponent extends Component {
    constructor(name, entity) {
        super(name, entity);
        this.setX = (x) => { this.entity.transform.setX(x) };
        this.setY = (y) => { this.entity.transform.setY(y) };
        this.setZ = (z) => { this.entity.transform.setZ(z) };
        this.setTransform = (xyz) => { this.entity.transform.setTransform(xyz); }
        this.setNormalizedScale = (normal) => { this.entity.transform.setDefaultScale(normal) }
        this.setRotation = (degrees) => { this.entity.transform.setRotation(degrees) };
        this.setScale = (vec3f) => { this.entity.transform.setScale(vec3f) };
        this.setScaleX = (x) => { this.entity.transform.setScaleX(parseFloat(x)) };
        this.setScaleY = (y) => { this.entity.transform.setScaleY(parseFloat(y)) };
        this.setScaleZ = (z) => { this.entity.transform.setScaleZ(parseFloat(z)) };
        this.getX = () => { return parseFloat(this.entity.transform.getX()); };
        this.getY = () => { return parseFloat(this.entity.transform.getY()); };
        this.getZ = () => { return parseFloat(this.entity.transform.getZ()); };
        this.getRotation = () => { return this.entity.transform.getRotation(); };
        this.getScale = () => { return this.entity.transform.getScale(); };
        this.getScaleX = () => { return this.entity.transform.getScale()[0]; };
        this.getScaleY = () => { return this.entity.transform.getScale()[1]; };
        this.getScaleZ = () => { return this.entity.transform.getScale()[2]; };
    }
}
class CameraComponent extends Component {
    constructor(name, entity, ui) {
        super(name, entity);
        this.camera = {
            x: 0,
            y: 0,
            z: 10,
            pitch: 0,
            yaw: 0,
            roll: 0,
            speed: 1,
            scrollSpeed: .6,
        };
        this.active = false;
        this.move = () => {
            const pitch = (this.camera.pitch * Math.PI / 180);
            const yaw = (this.camera.yaw * Math.PI / 180);
            const forward = [Math.cos(pitch) * -Math.sin(yaw), Math.sin(pitch), Math.cos(pitch) * -Math.cos(yaw)];
            const right = crossVec3(forward, [0, -1, 0]);
            let speed = this.camera.speed / 100;
            if (ui.pressedKeys['ShiftLeft']) {
                speed += speed;
            }
            if (ui.pressedKeys['KeyA'] | ui.pressedKeys['KeyD']) {
                let direction = ui.pressedKeys['KeyA'] ? 1 : -1;
                this.entity.forwardVector[0] = speed * right[0] * direction;
                this.entity.forwardVector[2] = speed * right[2] * direction;
                if (!ui.pressedKeys['KeyW'] && !ui.pressedKeys['KeyS'])
                    this.entity.forwardVector[1] = 0;
                this.camera.x += this.entity.forwardVector[0];
            }
            if (ui.pressedKeys['KeyW'] | ui.pressedKeys['KeyS']) {
                let direction = ui.pressedKeys['KeyW'] ? 1 : -1;
                this.entity.forwardVector[1] = speed * direction;
                if (!ui.pressedKeys['KeyA'] && !ui.pressedKeys['KeyD']) {
                    this.entity.forwardVector[0] = 0;
                    this.entity.forwardVector[2] = 0;
                }
                this.camera.y += this.entity.forwardVector[1];
            }
            if (this.camera.z < 1)
                this.camera.z = 1;
        }
        this.update = () => {
            if (!playing)
                return;
            if (!this.entity.getComponent('collider').isColliding) {
                this.entity.getComponent('transform').update();
                this.entity.getComponent('transform').setX(this.camera.x)
                this.entity.getComponent('transform').setY(this.camera.y)
                this.entity.getComponent('transform').update();
            } else {
                this.camera.x = this.entity.getComponent('transform').getX();
                this.camera.y = this.entity.getComponent('transform').getY();
            }
            this.move();
        }
    }
}
class ScriptComponent extends Component {
    constructor(name, entity) {
        super(name, entity);
        this.script = new Script(this.entity);
        this.run = () => { };
        this.update = (ent) => {
            this.run = () => { this.script.run(); };
        }
    }
}
class Player extends Entity {
    constructor(transform, system, name, texCoords = 0, color = [1, 1, 1, 1.0]) {
        super(transform, system);
        this.name = name;
        this.color = color;
        this.texCoord = texCoords;
        this.addComponent(new TransformComponent('transform', this));
        this.addComponent(new TextureComponent('texture', this));
        this.getTransform = () => {
            return this.getComponent('transform');
        }
    }
}
class GameObject extends Entity {
    constructor(transform, system, name, texCoord = 0, color = [1, 1, 1, 1.0]) {
        super(transform, system);
        this.name = name;
        this.texCoord = texCoord;
        this.color = color;
        this.addComponent(new TransformComponent('transform', this));
        this.addComponent(new TextureComponent('texture', this));
    }
    get getTransform() {
        return this.getComponent('transform');
    }
}