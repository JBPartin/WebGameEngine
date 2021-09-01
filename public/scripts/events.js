const times = [];
const elements = document.getElementById('sceneelements');
const play = document.getElementById('play-button');
const stop = document.getElementById('stop-button');
const ctxMenu = document.getElementById("ctxMenu");
const ctxMenu2 = document.getElementById("ctxMenu2");
const rename = document.getElementById('rename');
const info = document.getElementById('info');
let selectedElem = undefined;
window.addEventListener('keydown', (e) => {
    if (document.activeElement != canvas)
        return;
    e.preventDefault();
    e.stopPropagation();
    ui.pressedKeys[e.code] = true;
});
window.addEventListener('keyup', (e) => {
    e.preventDefault();
    e.stopPropagation();
    ui.pressedKeys[e.code] = false;
});
canvas.addEventListener('mousedown', (e) => {
    if (playing)
        return;
    drag.isDown = true;
    drag.fromY = e.clientY;
    drag.fromX = e.clientX;
    drag.currentY = camera.y;
    drag.currentX = camera.x;
    e.preventDefault();
    e.stopPropagation();
});
window.addEventListener('mouseup', (e) => {
    if (playing)
        return;
    drag.isDown = false;
    drag.fromY = 0;
    drag.fromX = 0;
    drag.draggedX = 0;
    drag.draggedY = 0;

});
window.addEventListener('mousemove', (e) => {
    if (playing)
        return;
    if (drag.isDown) {
        let dragSpeed;
        if (camera.z < 5) { dragSpeed = 350 } else
            if (camera.z < 30) { dragSpeed = 75 } else
                if (camera.z < 50) { dragSpeed = 50 } else
                    if (camera.z < 70) { dragSpeed = 30 } else { dragSpeed = 15 }
        drag.draggedY = -(drag.fromY - e.clientY) / dragSpeed;
        drag.draggedX = (drag.fromX - e.clientX) / dragSpeed;
        camera.y = drag.currentY + drag.draggedY;
        camera.x = drag.currentX + drag.draggedX;
    }
});
window.addEventListener('wheel', function (e) {
    if (document.activeElement != canvas)
        return;
    if (!playing) {
        camera.z += e.deltaY / 125 * camera.scrollSpeed;
        camera.z = Math.max(1, Math.min(camera.z, 100));
        return false;
    }
}, false);
window.addEventListener('click', (e) => {
    if (e.target == canvas) {
        canvas.focus();
    }
    if (elements.contains(e.target) && elements != e.target) {
        for (let elem of elements.children) {
            if (elem.classList.contains('selected')) {
                elem.classList.remove('selected');
                elem.style.backgroundColor = 'transparent'
                elem.style.color = 'black';
            }
        }
        e.target.classList.add('selected');
        e.target.style.backgroundColor = '#0044CC'
        e.target.style.color = 'rgb(180,180,180)'
        updateInfo();

    }
    if (e.target == play) {
        if (!playing) {
            canvas.focus();
            play.classList.add('isPlaying');
            stop.classList.remove('isPlaying');
            for (ent of sys.entities) {
                if (ent.getComponent('camera')) {
                    activeCamera = ent.id;
                }
            }

            playing = true;
        }
    } else if (e.target == stop) {
        if (playing) {
            canvas.focus();
            stop.classList.add('isPlaying');
            play.classList.remove('isPlaying');
            playing = false;
            activeCamera = -1;
        }
    }
});
elements.addEventListener("contextmenu", function (e) {
    e.preventDefault();
    if (e.target == elements) {
        ctxMenu.style.display = "block";
        ctxMenu.style.left = (e.pageX - 10) + "px";
        ctxMenu.style.top = (e.pageY - 10) + "px";
    } else if (elements.contains(e.target)) {
        ctxMenu2.style.display = "block";
        ctxMenu2.style.left = (e.pageX - 10) + "px";
        ctxMenu2.style.top = (e.pageY - 10) + "px";
        selectedElem = e.target;
    }
}, false);
window.addEventListener('mouseover', (e) => {
    if (!ctxMenu.contains(e.target)) {
        if (ctxMenu.style.display != 'none') {
            ctxMenu.style.display = 'none';
            ctxMenu.style.left = "";
            ctxMenu.style.top = "";
        }
    }
    if (!ctxMenu2.contains(e.target)) {
        if (ctxMenu2.style.display != 'none') {
            ctxMenu2.style.display = 'none';
            ctxMenu2.style.left = "";
            ctxMenu2.style.top = "";
            selectedElem = undefined;
        }
    }
});
let objects = 1;
window.addEventListener("click", function (e) {
    if (ctxMenu.style.display != 'none') {
        ctxMenu.style.display = 'none';
        ctxMenu.style.left = "";
        ctxMenu.style.top = "";
        if (e.target.title == 'Object') {
            new GameObject(new Transform(), sys, `Object-${objects++}`);
        }
        updateInfo();
    } else if (ctxMenu2.style.display != 'none') {
        ctxMenu2.style.display = 'none';
        ctxMenu2.style.left = "";
        ctxMenu2.style.top = "";
        let index = Array.from(elements.children).indexOf(selectedElem);
        if (e.target.title == 'Delete') {
            let selectedInfo = document.getElementById(`${sys.getEntity(index).name}-componenets`);
            selectedInfo.remove();
            sys.removeEntity(index);
            selectedElem.remove();
            selectedElem = undefined;
        } else if (e.target.title == 'Rename') {
            rename.style.display = "block";
            rename.style.left = selectedElem.getBoundingClientRect().x + "px";
            rename.style.top = selectedElem.getBoundingClientRect().y + "px";
            rename.style.width = selectedElem.parentNode.getBoundingClientRect().width - 4 + "px";
            rename.style.height = selectedElem.getBoundingClientRect().height - 2 + "px";
            rename.style.textAlign = 'left';
            rename.focus();
        } else if (e.target.title == 'Camera') {
            let ent = sys.getEntity(index);
            if (!ent.getComponent('camera'))
                ent.addComponent(new CameraComponent('camera', ent, ui));
        } else if (e.target.title == 'Script') {
            let ent = sys.getEntity(index);
            if (!ent.getComponent('script'))
                ent.addComponent(new ScriptComponent('script', ent));
            let selectedInfo = document.getElementById(`${sys.getEntity(index).name}-componenets`);
            selectedInfo.remove();
            createComponentDiv(ent).remove();
        }
        updateInfo();
    } else if (rename.style.display != 'none' && e.target != rename) {
        rename.style.display = 'none';
        rename.style.left = "";
        rename.style.top = "";
        rename.value = '';
    }
    if (e.target.classList.contains('files-object')) {
        if (e.target.classList.contains('selected-file')) {
            console.log(e.target.id);
        }
        for (child of e.target.parentNode.children) {
            if (child != e.target) {
                child.classList.remove('selected-file');
            }
        }
        e.target.classList.toggle('selected-file');
    } else if (e.target.parentNode.classList && e.target.parentNode.classList.contains('files-object')) {
        if (e.target.parentNode.classList.contains('selected-file')) {
            getJSON('data/' + e.target.parentNode.id).then(res => console.log(res)).catch(err => console.log(err));
        }
        for (child of e.target.parentNode.parentNode.children) {
            if (child != e.target.parentNode) {
                child.classList.remove('selected-file');
            }
        }
        e.target.parentNode.classList.toggle('selected-file');
    } else if (e.target.id === 'files') {
        for (child of e.target.children) {
            child.classList.remove('selected-file');
        }
    }
}, false);
rename.addEventListener('change', () => {
    let index = Array.from(elements.children).indexOf(selectedElem);
    if (!document.getElementById(rename.value)) {
        let selectedInfo = document.getElementById(`${sys.getEntity(index).name}-componenets`);
        selectedInfo.remove();
        sys.getEntity(index).name = rename.value;
        let div = createComponentDiv(sys.getEntity(index));
        elements.insertBefore(div, selectedElem);
        selectedElem.remove();
    }
    selectedElem = undefined;
    rename.style.display = 'none';
    rename.style.left = "";
    rename.style.top = "";
    rename.value = '';
    updateInfo();
});
function updateInfo() {
    for (let ent of sys.entities) {
        if (document.getElementById(ent.name)) {
            if (!document.getElementById(ent.name).classList.contains('selected')) {
                if (document.getElementById(`${ent.name}-componenets`).style.display != 'none') {
                    document.getElementById(`${ent.name}-componenets`).style.display = 'none';
                }
                continue;
            } else {
                document.getElementById(`${ent.name}-componenets`).style.display = 'block';
            }
            for (let comps of Object.keys(ent.components)) {
                if (comps == 'transform') {
                    let div = document.getElementById(`${ent.name}-${comps}-translation`);
                    let div2 = document.getElementById(`${ent.name}-${comps}-scale`);
                    div.children[1].value = `${ent.getComponent(comps).getX().toFixed(2)}`;
                    div.children[3].value = `${ent.getComponent(comps).getY().toFixed(2)}`;
                    div2.children[1].value = `${ent.getComponent(comps).getScaleX().toFixed(2)}`;
                    div2.children[3].value = `${ent.getComponent(comps).getScaleY().toFixed(2)}`;
                } else if (comps == 'texture') {
                    let div = document.getElementById(`${ent.name}-${comps}-texture`);
                    let div2 = document.getElementById(`${ent.name}-${comps}-color`);
                    div.children[1].value = `${ent.getComponent(comps).getTextureID()}`;
                    div.children[3].value = `${ent.getComponent(comps).getColorAlpha()}`;
                    let colors = ent.getComponent(comps).getColor();
                    div2.children[0].value = (rgbArrayToHex(colors));
                } else if (comps == 'script') {
                    let vars = document.getElementById(`${ent.name}-${comps}-script01-vars`);
                    vars.innerHTML = `${Object.entries(ent.getComponent('script').script.globals).map(values => `<p>${values[0]} : ${values[1]}</p>`).join('')}`;
                }
            }
        } else {
            createComponentDiv(ent);
        }
    }
}
updateInfo();
function createComponentDiv(ent) {
    let div = document.createElement('div');
    div.id = ent.name;
    div.innerHTML = ent.name;
    div.style.width = 'fit-content'
    elements.appendChild(div);
    let container = document.createElement('div');
    container.id = `${ent.name}-componenets`;
    let selected = document.createElement('h2');
    selected.id = `${ent.name}-name`
    selected.innerHTML = `${ent.name}`;
    selected.style.marginBottom = '10px';
    container.style.textAlign = 'center';
    container.appendChild(selected);
    container.classList.add('scrollbar');
    for (let comps of Object.keys(ent.components)) {
        let div2 = document.createElement('h3');
        div2.style.backgroundColor = 'rgb(80,80,80)'
        div2.style.padding = '10px 10px'
        div2.style.margin = '10px 5px'
        div2.style.border = 'rgb(70,70,70) solid 3px';
        div2.style.borderRadius = '5px';
        container.appendChild(div2);
        if (comps == 'transform') {
            let div3 = document.createElement('div');
            let div4 = document.createElement('div');
            let location = document.createElement('p');
            location.innerHTML = 'Location';
            let scale = document.createElement('p');
            scale.innerHTML = 'Scale';
            let x = document.createElement('input');
            let y = document.createElement('input');
            let xl = document.createElement('label');
            let yl = document.createElement('label');
            xl.innerHTML = 'X:'
            xl.for = `${ent.name}-x`
            x.id = `${ent.name}-x`
            x.type = 'number';
            x.step = 'any'
            yl.innerHTML = 'Y:'
            y.id = `${ent.name}-y`
            yl.for = `${ent.name}-y`
            y.type = 'number';
            y.step = 'any'
            let sx = document.createElement('input');
            let sy = document.createElement('input');
            let sxl = document.createElement('label');
            let syl = document.createElement('label');
            sxl.innerHTML = 'X:'
            sxl.for = `${ent.name}-sx`
            syl.innerHTML = 'Y:'
            syl.for = `${ent.name}-sy`
            sx.type = 'number';
            sx.step = 'any'
            sy.type = 'number';
            sy.step = 'any'
            x.addEventListener('change', (e) => {
                ent.getComponent(comps).setX(parseFloat(x.value).toFixed(2));
                updateInfo();
            });
            y.addEventListener('change', (e) => {
                ent.getComponent(comps).setY(parseFloat(y.value).toFixed(2));
                updateInfo();
            });
            sx.addEventListener('change', (e) => {
                ent.getComponent(comps).setScaleX(parseFloat(sx.value).toFixed(2));
                updateInfo();
            });
            sy.addEventListener('change', (e) => {
                ent.getComponent(comps).setScaleY(parseFloat(sy.value).toFixed(2));
                updateInfo();
            });
            div3.style.fontWeight = 200;
            div4.style.fontWeight = 200;
            div3.style.fontSize = '15px';
            div4.style.fontSize = '15px';
            div3.style.width = '100%';
            div4.style.width = '100%';
            div3.id = `${ent.name}-${comps}-translation`;
            div3.classList.add('inputboxes');
            div4.id = `${ent.name}-${comps}-scale`;
            div4.style.marginBottom = '10px';
            div4.classList.add('inputboxes');
            div3.appendChild(xl);
            div3.appendChild(x);
            div3.appendChild(yl);
            div3.appendChild(y);
            div4.appendChild(sxl);
            div4.appendChild(sx);
            div4.appendChild(syl);
            div4.appendChild(sy);
            div2.appendChild(location);
            div2.appendChild(div3);
            div2.appendChild(scale);
            div2.appendChild(div4);
        } else if (comps == 'texture') {
            let div3 = document.createElement('div');
            let div4 = document.createElement('div');
            let TextureAlpha = document.createElement('p');
            TextureAlpha.innerHTML = 'Texture/Alpha';
            let color = document.createElement('p');
            color.innerHTML = 'Color';
            let id = document.createElement('input');
            id.id = `${ent.name}-id`;
            let alpha = document.createElement('input');
            alpha.id = `${ent.name}-alpha`;
            let idl = document.createElement('label');
            let alphal = document.createElement('label');
            idl.innerHTML = 'ID:'
            idl.for = `${ent.name}-id`
            alphal.innerHTML = 'A:'
            alphal.for = `${ent.name}-alpha`
            alpha.value = 1;
            id.type = 'number';
            id.step = '1';
            id.min = 0;
            alpha.type = 'number';
            alpha.step = '.01';
            alpha.max = 1;
            alpha.min = 0;
            let r = document.createElement('input');
            r.type = 'color';
            r.style.width = '100%';
            r.style.height = '30px';
            setInterval(() => {
                if (document.activeElement != r)
                    return;
                let rgb = hexToRgb(r.value);
                ent.getComponent(comps).setColor(rgb.r / 255, rgb.g / 255, rgb.b / 255, alpha.value);
                updateInfo();
            }, 10);

            id.addEventListener('change', (e) => {
                ent.getComponent(comps).setTextureID(parseInt(id.value));
                updateInfo();
            });
            alpha.addEventListener('change', (e) => {
                ent.getComponent(comps).setColorAlpha(parseFloat(alpha.value));
                updateInfo();
            });
            div3.style.fontWeight = 200;
            div4.style.fontWeight = 200;
            div3.style.fontSize = '15px';
            div4.style.fontSize = '15px';
            div3.style.width = '100%';
            div4.style.width = '100%';
            div3.id = `${ent.name}-${comps}-texture`;
            div3.classList.add('inputboxes');
            div4.id = `${ent.name}-${comps}-color`;
            div4.style.marginBottom = '10px';
            div4.classList.add('inputboxes');
            div3.appendChild(idl);
            div3.appendChild(id);
            div3.appendChild(alphal);
            div3.appendChild(alpha);
            div2.appendChild(TextureAlpha);
            div2.appendChild(div3);
            div2.appendChild(color);
            div4.appendChild(r);
            div2.appendChild(div4);
        } else if (comps == 'script') {
            let vars = document.createElement('div');
            vars.id = `${ent.name}-${comps}-script01-vars`;
            div2.innerHTML = 'ScriptName';
            vars.innerHTML = `${ent.getComponent('script').script.globals}`;
            div2.appendChild(vars);
        } else {
            container.removeChild(div2);
        }
        container.style.display = 'none';
    }
    info.insertBefore(container, info.firstChild);
    return div;
}