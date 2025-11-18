import * as THREE from 'three/webgpu'
import { createStandardMaterial, loadGltf } from './tools.js'
import { textureloader } from './tools.js'
export class Scene {
    constructor() {
        this.scene = new THREE.Scene()
        this.sun = new THREE.DirectionalLight(this.sunParams.color, this.sunParams.intensity)
        this.ground = null
        this.helper = new THREE.DirectionalLightHelper(this.sun)
        this.models = {}
    }

    addCube() {
        const geometry = new THREE.BoxGeometry(1, 1, 1)
        const material = new THREE.MeshPhongMaterial({
            color: 0xFF0000,
            flatShading: true,
        }) 

        const cube = new THREE.Mesh(geometry, material)
        cube.position.set(0, 1, 0)
        this.scene.add(cube)
    }

    addAmbientLight() {
        this.sun.position.set(this.sunParams.position.x, this.sunParams.position.y, this.sunParams.position.z)
        this.sun.target.position.set(0, 0, 0)
        
        this.sun.castShadow = true
        this.sun.shadow.camera.left = -100
        this.sun.shadow.camera.right = 100
        this.sun.shadow.camera.top = 100
        this.sun.shadow.camera.bottom = -100
        this.sun.shadow.camera.near = 1
        this.sun.shadow.camera.far = 200
        this.sun.shadow.mapSize.set(2048, 2048)
        this.scene.add(this.sun)
        this.scene.add(this.helper)
    }

    updateSun(color, intensity, X, Z) {
        this.sun.color = new THREE.Color(color)
        this.sun.intensity = intensity
        this.sun.position.set(X, this.sun.position.y, Z)
    }

    addGround(texture, repeats) {
        const planeGeometry = new THREE.PlaneGeometry(5000, 5000)
        const material = createStandardMaterial(texture, repeats)
        this.ground = new THREE.Mesh(planeGeometry, material)
        this.ground.rotation.x = Math.PI * -.5
        this.ground.position.y = -0.1
        this.ground.receiveShadow = true
        this.scene.add(this.ground)
    }

    changeGround(texture, repeats) {
        if (this.ground) {
            this.scene.remove(this.ground)
        }
        this.addGround(texture, repeats)
    }

    addSkybox(file) {
        textureloader.load(
            `skybox/${file}`,
            (texture) => {
                texture.mapping = THREE.EquirectangularReflectionMapping
                texture.colorSpace = THREE.SRGBColorSpace
                this.scene.background = texture
            }
        ) 
    }

    changeSkybox(file) {
        if (this.scene.background) {
            this.scene.background.dispose()
        }
        this.addSkybox(file)
    }

    async loadScene(url) {
        const data = await fetch(url)
        const json = await data.json()
        for (const item of json.nodes) {
            if (!this.models[item.name]) {
                this.models[item.name] = await loadGltf(item.name)
            }
            let mesh = this.models[item.name].clone()
            mesh.position.fromArray(item.position.split(',').map(Number))
            mesh.quaternion.fromArray(item.rotation.split(',').map(Number))
            mesh.scale.fromArray(item.scale.split(',').map(Number))

            mesh.traverse(o => {
                if (o.isMesh) {
                    o.userData = {
                        isSelectable: true,
                        object : mesh,
                    };
                }
            })
            this.scene.add(mesh)
        }
        return json.params
    }

    exportScene(params) {
        let exportData = {
            params: {
                skybox: params.skybox.file,
                ground: {
                    texture: params.ground.texture,
                    repeats: params.ground.repeats
                },
                sun: {
                    color: this.sun.color.getHex(),
                    intensity: this.sun.intensity,
                    position: {
                        x: this.sun.position.x,
                        z: this.sun.position.z
                    }
                }
            },
            nodes: [],
        };
        let toExport = new Set()
        this.scene.traverse((obj) => {
            if (obj.userData && obj.userData.isSelectable) {
                toExport.add(obj.userData.object);
            }
        });
        toExport.forEach((obj) => {  
            exportData.nodes.push({
                name: obj.name || '',
                position: `${obj.position.x},${obj.position.y},${obj.position.z}`,
                rotation: `${obj.quaternion.x},${obj.quaternion.y},${obj.quaternion.z},${obj.quaternion.w}`,
                scale: `${obj.scale.x},${obj.scale.y},${obj.scale.z}`
            });
        });

        const jsonStr = JSON.stringify(exportData, null, 2)
        const blob = new Blob([jsonStr], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'scene_export.json'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    clearScene() {
        let objectsToRemove = new Set()
        this.scene.traverse((obj) => {
            if (obj.userData && obj.userData.isSelectable) {
                objectsToRemove.add(obj.userData.object)
            }
        })
        objectsToRemove.forEach((obj) => {  
            this.scene.remove(obj)
        })        
    }

    async importScene(event, params) {
        this.clearScene()
        const file = event.target.files?.[0]
        if (!file) return
        const url = URL.createObjectURL(file)
        try {
            const loadedParams = await this.loadScene(url);
            if (loadedParams.skybox) params.skybox = loadedParams.skybox
            if (loadedParams.ground) params.ground = loadedParams.ground
            if (loadedParams.sun) params.sun = loadedParams.sun
            this.changeSkybox(params.skybox)
            this.changeGround(params.ground.texture, params.ground.repeats)
            this.updateSun(
                params.sun.color,
                params.sun.intensity,
                params.sun.position.x,
                params.sun.position.z
            )
        } catch (err) {
            alert('Import failed: ' + (err?.message ?? err));
        } finally {
            URL.revokeObjectURL(url)
        }
    }

    sunParams = {
        color: 0xFFFFFF,
        intensity: 1,
        position: { x: 3, y: 5, z: 0 }
    }
}