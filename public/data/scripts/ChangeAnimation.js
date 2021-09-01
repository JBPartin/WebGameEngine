this.onStart = () => {
    this.globals['up'] = true;
}
let script = this;
this.onUpdate = () => {
    if (this.getPressedKeys['KeyD']) {
        if (this.getSpriteData.getState != 1)
            this.setSpriteState = 1;
        if (this.getTransform.getScaleX() < 0)
            this.getTransform.setScaleX(-this.getTransform.getScaleX());
        if (this.getTransform.getRotation() !== 0)
            this.getTransform.setRotation(0);
    } else if (this.getPressedKeys['KeyA']) {
        if (this.getSpriteData.getState != 1)
            this.setSpriteState = 1;
        if (this.getTransform.getScaleX() > 0)
            this.getTransform.setScaleX(-this.getTransform.getScaleX());
        if (this.getTransform.getRotation() !== 0)
            this.getTransform.setRotation(0);
    } else if (this.getPressedKeys['KeyW']) {
        if (this.getSpriteData.getState != 1)
            this.setSpriteState = 1;
        if (this.getTransform.getRotation() !== 90 * (this.getTransform.getScaleX() < 0 ? -1 : 1))
            this.getTransform.setRotation(90 * (this.getTransform.getScaleX() < 0 ? -1 : 1));
    } else if (this.getPressedKeys['KeyS']) {
        if (this.getSpriteData.getState != 1)
            this.setSpriteState = 1;
        if (this.getTransform.getRotation() !== 90 * (this.getTransform.getScaleX() < 0 ? 1 : -1))
            this.getTransform.setRotation(90 * (this.getTransform.getScaleX() < 0 ? 1 : -1));
    } else
    if (this.getSpriteData.getState != 0)
        this.setSpriteState = 0;
}

function spawnBullet() {
    let entTrans = script.getTransform;
    let bullet = script.spawnObject;
    bullet.getComponent('texture').setColor(255, 255, 0, 1);
    let direction = Math.sign(entTrans.getScaleX());
    let entX = entTrans.getX() + entTrans.getScaleX();
    bullet.transform.setScaleY(.1);
    bullet.transform.setScaleX(.5);
    bullet.transform.setY(entTrans.getY());
    bullet.getTransform.setX(direction * .1 + (entX + direction));
    bullet.addComponent(new ColliderComponent('collider', bullet));
    let collider = undefined;
    return new Promise((resolve, reject) => {
        for (let i = 0; i <= 100; i++) {
            bullet.forwardVector = [direction * .10, 0, 0];
            setTimeout(() => {
                if (bullet) {
                    bullet.getTransform.setX(direction * (i / 10) + (entX + direction));
                    if (bullet.getComponent('collider').isColliding) {
                        collider = bullet.getComponent('collider').colliding;
                        bullet.forwardVector = [0, 0, 0];
                        bullet.destroy();
                        bullet = undefined;
                        resolve(collider);
                    }
                    if (i == 100) {
                        bullet.forwardVector = [0, 0, 0];
                        bullet.destroy();
                        bullet = undefined;
                        resolve(collider);
                    }
                }
            }, i * 5);
        }
    });
}

this.onMouseUp = () => {
    this.globals['up'] = true;
}

this.onMouseDown = () => {
    this.globals['up'] = false;
    let interval = setInterval(async() => {
        let collider = await spawnBullet();
        if (collider) {
            let color = collider.getComponent('texture');
            if (color.getColorAlpha() > 0)
                color.setColorAlpha(color.getColorAlpha() - .1);
            else {
                collider.transform.setZ(-1);
                setTimeout(() => {
                    color.setColorAlpha(1);
                    collider.transform.setZ(0);
                }, 1000);
            }
        }
        if (this.globals['up']) {
            clearInterval(interval);
        }
    }, 80);
}