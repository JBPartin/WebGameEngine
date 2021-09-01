class Renderer {
    constructor(gl, sys) {
        this.gl = gl;
        this.sys = sys;
        this.init = () => {
            this.gl.enable(this.gl.BLEND);
            this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
            this.aspect = this.gl.canvas.clientWidth / this.gl.canvas.clientHeight;
            this.fieldOfView = 75 * Math.PI / 180;
            this.zNear = 0.1;
            this.zFar = 1000.0;
            this.vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);
            this.gl.shaderSource(this.vertexShader, `
                precision mediump float;
        
                attribute vec4 position;
                attribute vec4 color;
                attribute vec2 uv;
                attribute float texCoord;
        
                uniform mat4 projection;
                uniform mat4 view;
                uniform mat4 model;
        
                varying vec4 vColor;
                varying vec2 vUV;
                varying float vTexCoord;
                void main() {
                    vTexCoord = texCoord;
                    vUV = uv;
                    vColor = color;
                    gl_Position = projection * view * model * position;
                }
                `);
            this.gl.compileShader(this.vertexShader);
            if (!this.gl.getShaderParameter(this.vertexShader, this.gl.COMPILE_STATUS))
                console.log(this.gl.getShaderInfoLog(this.vertexShader));

            this.fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
            this.gl.shaderSource(this.fragmentShader, `
                precision mediump float;
                varying vec2 vUV;
                varying vec4 vColor;
                varying float vTexCoord;
                uniform sampler2D textureID;
        
                void main() {
                    if(vTexCoord == 0.0){
                        gl_FragColor = vColor;
                    }else{
                        vec4 texelColor = texture2D(textureID, vUV); 
                        gl_FragColor = vec4(texelColor.rgb, texelColor.a) * vec4(1,1,1,vColor[3]);
                    }
                }
                `);

            this.gl.compileShader(this.fragmentShader);
            if (!this.gl.getShaderParameter(this.fragmentShader, this.gl.COMPILE_STATUS))
                console.log(this.gl.getShaderInfoLog(this.fragmentShader));

            this.program = this.gl.createProgram();
            this.gl.attachShader(this.program, this.vertexShader);
            this.gl.attachShader(this.program, this.fragmentShader);
            this.gl.linkProgram(this.program);
            if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS))
                console.log(this.gl.getProgramInfoLog(this.program));

            this.programInfo = {
                program: this.program,
                attribLocations: {
                    vertexPosition: this.gl.getAttribLocation(this.program, 'position'),
                    color: this.gl.getAttribLocation(this.program, 'color'),
                    uv: this.gl.getAttribLocation(this.program, 'uv'),
                },
                uniformLocations: {
                    projectionMatrix: this.gl.getUniformLocation(this.program, 'projection'),
                    viewMatrix: this.gl.getUniformLocation(this.program, 'view'),
                    modelMatrix: this.gl.getUniformLocation(this.program, 'model'),
                    textureID: this.gl.getUniformLocation(this.program, 'textureID'),
                },
            };

            this.images = {
                1: loadTexture(`images/camel/camelleft.jpg`, 1, this.gl),
                2: loadTexture(`images/penguin/pfp.png`, 2, this.gl),
                3: loadTexture(`images/camel/player.png`, 3, this.gl),
                4: loadTexture(`images/camel/Untitled.png`, 4, this.gl),
            }

            this.positionBuffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, sizeOf(createQuad(0, 0, [0, 0, 0, 0], 0)) * 5000, this.gl.DYNAMIC_DRAW);
            this.gl.vertexAttribPointer(0, 4, this.gl.FLOAT, false, 44, 0);
            this.gl.enableVertexAttribArray(0);

            this.gl.vertexAttribPointer(1, 4, this.gl.FLOAT, false, 44, 16);
            this.gl.enableVertexAttribArray(1);

            this.gl.vertexAttribPointer(2, 2, this.gl.FLOAT, false, 44, 32);
            this.gl.enableVertexAttribArray(2);

            this.gl.vertexAttribPointer(3, 1, this.gl.FLOAT, false, 44, 40);
            this.gl.enableVertexAttribArray(3);


            this.indices = [];
            let offset = 0;
            let length = this.sys.entities.length;
            for (let i = 0; i < Math.max(length, 1); i += 6) {
                this.indices[i + 0] = 0 + offset;
                this.indices[i + 1] = 1 + offset;
                this.indices[i + 2] = 2 + offset;
                this.indices[i + 3] = 0 + offset;
                this.indices[i + 4] = 2 + offset;
                this.indices[i + 5] = 3 + offset;
                offset += 4;
            }

            this.indexBuffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER,
                new Uint16Array(this.indices), this.gl.STATIC_DRAW);

            this.pMatrix = mat4.create();
            mat4.perspective(this.pMatrix, this.fieldOfView, this.aspect, this.zNear, this.zFar);
            this.mMatrix = mat4.create();
        }
        this.bind = () => {
            let viewCamera = activeCamera == -1 ? camera : this.sys.getEntity(activeCamera).getComponent('camera').camera;
            this.gl.useProgram(this.program);
            this.gl.clearColor(.38, .38, .38, 1.0);
            this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
            const vMatrix = mat4.create();
            mat4.translate(vMatrix, vMatrix, [viewCamera.x, viewCamera.y, viewCamera.z]);
            mat4.rotate(vMatrix, vMatrix, (viewCamera.yaw * Math.PI / 180), [0, 1, 0]);
            mat4.rotate(vMatrix, vMatrix, (viewCamera.pitch * Math.PI / 180), [1, 0, 0]);
            mat4.rotate(vMatrix, vMatrix, (viewCamera.roll * Math.PI / 180), [0, 0, 1]);
            mat4.invert(vMatrix, vMatrix);
            this.gl.uniformMatrix4fv(this.programInfo.uniformLocations.modelMatrix, false, this.mMatrix);
            this.gl.uniformMatrix4fv(this.programInfo.uniformLocations.projectionMatrix, false, this.pMatrix);
            this.gl.uniformMatrix4fv(this.programInfo.uniformLocations.viewMatrix, false, vMatrix);
            for (let i = 0; i < Object.keys(this.images).length + 1; i++) {
                let verticies = [];
                let index = 0;
                if (i == 2)
                    verticies.push(...createQuad(0, 0, [0.7, 0.4, 1.0, 1], 2, 0, [200, 200, 1]));
                index = verticies.length / 40 * 6;
                this.gl.activeTexture(this.gl.TEXTURE0 + i)
                this.gl.bindTexture(this.gl.TEXTURE_2D, this.images[i]);
                this.gl.uniform1i(this.programInfo.uniformLocations.textureID, i);
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
                this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(verticies), this.gl.DYNAMIC_DRAW);
                this.gl.drawElements(this.gl.TRIANGLES, index, this.gl.UNSIGNED_SHORT, 0);
            }
            for (let ent of this.sys.entities) {
                ent.draw(this.gl, this.images, this.positionBuffer, this.programInfo);
            }
        }
    }
}
window.onload = () => {
    function drawScene() {
        const now = performance.now();
        while (times.length > 0 && times[0] <= now - 1000) { times.shift(); }
        times.push(now);
        frames = times.length;
        fps.innerHTML = `fps: ${frames}`;
        sys.update();
        renderer.bind();
        requestAnimationFrame(drawScene);
    }
    requestAnimationFrame(drawScene);
}