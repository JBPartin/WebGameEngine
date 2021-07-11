class System {
    constructor() {
        this.entities = [];
        this.addEntity = (ent) => {
            this.entities.push(ent);
        }
        this.getEntity = (i) => {
            return this.entities[i];
        }
        this.removeEntity = (i) => {
            this.entities.splice(i, 1);
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
        system.addEntity(this);
        this.transform = transform;
        this.positions = [];
        this.components = {};
        this.system = system;
        this.canCollide = true;
        this.texCoord = 0;
        this.color = [0, 0, 0, 0];
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
    constructor(entity) {
        this.#entity = entity;
        this.run = () => { };
    }
    getSprite() {
        return this.#entity.getComponent('sprite');
    }
    getTransform() {
        return this.#entity.getComponent('transform');
    }
    getTexture() {
        return this.#entity.getComponent('texture');
    }
    /**
     * @param  {function} func
     */
    onClick(func) {
        window.addEventListener('click', () => {
            func();
        });
    }
}
class SpriteComponent extends Component {
    constructor(name, entity, sheeturl, jsonurl) {
        super(name, entity);
        this.animations = [];
        this.state = 1;
        this.index = 0;
        this.speed = .1;
        this.image = undefined;
        this.entity.draw = (gl, images, pos, info) => { this.animate(gl, images, pos, info); }
        this.setAnimations(sheeturl, jsonurl);
    }
    getState() {
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
        this.update = () => {
            for (let ent of this.entity.system.entities) {
                if (ent != this.entity) {
                    let lowX = (ent.transform.getX() - (ent.transform.getScale()[0] / 2));
                    let highX = (ent.transform.getX() + (ent.transform.getScale()[0] / 2));
                    let lowY = (ent.transform.getY() - (ent.transform.getScale()[1] / 2));
                    let highY = (ent.transform.getY() + (ent.transform.getScale()[1] / 2));
                    let lowX2 = ((this.entity.transform.getX() + this.entity.forwardVector[0]) - (this.entity.transform.getScale()[0] / 2));
                    let highX2 = ((this.entity.transform.getX() + this.entity.forwardVector[0]) + (this.entity.transform.getScale()[0] / 2));
                    let lowY2 = ((this.entity.transform.getY() + this.entity.forwardVector[1]) - (this.entity.transform.getScale()[1] / 2));
                    let highY2 = ((this.entity.transform.getY() + this.entity.forwardVector[1]) + (this.entity.transform.getScale()[1] / 2));
                    if ((highX2 > lowX && lowX2 < highX) | (lowX2 < highX && highX2 > lowX)) {
                        if ((highY2 > lowY && lowY2 < highY) | (lowY2 < highY && lowY2 > lowY)) {
                            this.isColliding = true;
                            break;
                        } else {
                            this.isColliding = false;
                        }
                    } else {
                        this.isColliding = false;
                    }
                }
            }
        };

    }
}
class TransformComponent extends Component {
    constructor(name, entity) {
        super(name, entity);
        this.x = 0.0;
        this.y = 0.0;
        this.z = 0.0;
        this.r = 0.0;
        this.s = [1.0, 1.0, 1.0];
        this.setX = (x) => { this.x = x; };
        this.setY = (y) => { this.y = y; };
        this.setZ = (z) => { this.z = z; };
        this.setRotation = (degrees) => { this.r = degrees; };
        this.setScale = (vec3f) => { this.s = vec3f; };
        this.setScaleX = (x) => { this.s[0] = parseFloat(x); };
        this.setScaleY = (y) => { this.s[1] = parseFloat(y); };
        this.setScaleZ = (z) => { this.s[2] = parseFloat(z); };
        this.getX = () => { return parseFloat(this.x); };
        this.getY = () => { return parseFloat(this.y); };
        this.getZ = () => { return parseFloat(this.z); };
        this.getRotation = () => { return this.r; };
        this.getScale = () => { return this.s; };
        this.getScaleX = () => { return this.s[0]; };
        this.getScaleY = () => { return this.s[1]; };
        this.getScaleZ = () => { return this.s[2]; };
        this.update = () => {
            this.entity.transform.setX(this.x);
            this.entity.transform.setY(this.y);
            this.entity.transform.setZ(this.z);
            this.entity.transform.setRotation(this.r);
            this.entity.transform.setScale(this.s);
        }
    }
}
class CameraComponent extends Component {
    constructor(name, entity) {
        super(name, entity);
        this.update = () => {
            this.entity.getComponent('transform').update();
            this.entity.getComponent('collider').update();
            if (!playing)
                return;
            if (!this.entity.getComponent('collider').isColliding) {
                this.entity.getComponent('transform').update();
                this.entity.getComponent('transform').setX(camera.x)
                this.entity.getComponent('transform').setY(camera.y)
                this.entity.getComponent('transform').update();
            } else {
                camera.x = this.entity.getComponent('transform').getX();
                camera.y = this.entity.getComponent('transform').getY();
            }
        }
    }
}
class ScriptComponent extends Component {
    constructor(name, entity) {
        super(name, entity);
        this.script = new Script(this.entity);
        this.run = () => { };
        this.update = (ent) => {
            this.run = this.script.run;
        }
    }
}

class Player extends Entity {
    constructor(transform, system, name, texCoords = 0, color = [1, 1, 1, 1.0]) {
        super(transform, system);
        this.name = name;
        this.color = color;
        this.texCoord = texCoords;
        this.forwardVector = [0, 0, 0];
        this.addComponent(new TransformComponent('transform', this));
        this.addComponent(new CameraComponent('camera', this));
        this.addComponent(new ColliderComponent('collider', this));
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
}