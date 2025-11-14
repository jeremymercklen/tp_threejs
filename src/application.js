import * as THREE from 'three/webgpu'
import { Scene } from './scene.js'
import { Camera } from './camera.js'
import { UI }   from './ui.js'
import { loadGltf } from './tools.js'

export class Application {
    
    constructor() {
        this.renderer = new THREE.WebGPURenderer({antialias: true})
        this.renderer.setSize(window.innerWidth, window.innerHeight)
        document.body.appendChild(this.renderer.domElement)

        this.scene = new Scene()
        this.scene.loadScene('scenes/scene_1.json')
        this.scene.addAmbientLight()
        this.initParams()
        this.scene.addGround(this.groundParams.texture, this.groundParams.repeats)
        this.scene.addSkybox(this.skyboxParams.file)
        
        this.camera = new Camera(this.renderer, this.globalParams)

        this.ui = new UI()
        this.ui.addWASDControls(this.globalParams, () => this.camera.toggleControls(this.globalParams))
        this.ui.addSceneUI(
            () => {
                this.scene.exportScene({ skybox : this.skyboxParams, ground: this.groundParams})
            },
            () => {
                importInput.click()
            },
            this.scene.clearScene.bind(this.scene)
        )
        this.ui.addSkyboxUI(this.skyboxFiles, this.skyboxParams, this.scene.changeSkybox.bind(this.scene))
        this.ui.addGroundUI(this.groundTextures, this.groundParams, ( ) => {
            this.scene.changeGround(this.groundParams.texture, this.groundParams.repeats)
        })
        this.ui.addSunUI(this.scene.sunParams, ( ) => {
            this.scene.updateSun(this.scene.sunParams.color, this.scene.sunParams.intensity, this.scene.sunParams.position.x, this.scene.sunParams.position.z)
        })
        // Add models UI (list of available models to add)
        this.modelsList = [
            'birch1', 'bush1', 'bush2', 'flowers1', 'grass1', 'log1',
            'oak1', 'oak2', 'oak3', 'pine1', 'spruce1', 'stone1', 'stone2', 'stump1'
        ]
        this.ui.addModelsUI(this.modelsList, this.addModel.bind(this))

        this.ui.addSelectionUI()

        this.selectedObject = null
        this.selectedMesh = null
        this.selectedMeshMaterial = null
        this.moveSelectedObject = false
        this.rotateSelectedObject = false
        this.rotateSensitivity = 0.01
        this._originalMaterials = []
        

        this.renderer.domElement.addEventListener('click', (event) => {
            if (this.globalParams.useWASD) return;
            // clear previous highlight
            this.clearHighlight()
            const rect = this.renderer.domElement.getBoundingClientRect()
            const mouse = new THREE.Vector2(
                ((event.clientX - rect.left) / rect.width) * 2 - 1,
                -((event.clientY - rect.top) / rect.height) * 2 + 1
            )
            const raycaster = new THREE.Raycaster()
            raycaster.setFromCamera(mouse, this.camera.camera)
            const intersects = raycaster.intersectObjects(this.scene.scene.children, true)
            const hit = intersects.find(i => i.object && i.object.userData && i.object.userData.isSelectable)
            if (hit) {
                this.selectedObject = hit.object
                this.selectedMesh = hit.object.userData.object
                this.selectedMeshMaterial = hit.object.material
                this.ui.updateSelectionUI(this.selectedMesh)
                this.highlightSelection(this.selectedMesh)
            }
            else {
                this.ui.hideSelectionUI()
                this.selectedObject = null
                this.selectedMesh = null
                this.selectedMeshMaterial = null
            }
        });

        document.body.addEventListener('keydown', (event) => {
            if (this.selectedMesh) {
                if (event.key === 'g') {
                    if (this.selectedObject != null) {
                        this.moveSelectedObject = !this.moveSelectedObject
                    }
                }
                if (event.key === 'r') {
                    if (this.selectedObject != null) {
                        this.rotateSelectedObject = true
                    }
                }
                if (event.key === 'Delete' || event.key === 'Backspace') {
                    if (this.selectedMesh != null) {
                        this.clearHighlight()
                        this.scene.scene.remove(this.selectedMesh)

                        this.selectedMesh.traverse((node) => {
                            if (node.isMesh) {
                                if (node.geometry) {
                                    try { node.geometry.dispose() } catch (e) {}
                                }
                                if (node.material) {
                                    const disposeMaterial = (mat) => {
                                        if (mat.map) { try { mat.map.dispose() } catch(e) {} }
                                        if (mat.normalMap) { try { mat.normalMap.dispose() } catch(e) {} }
                                        if (mat.roughnessMap) { try { mat.roughnessMap.dispose() } catch(e) {} }
                                        if (mat.metalnessMap) { try { mat.metalnessMap.dispose() } catch(e) {} }
                                        try { mat.dispose() } catch(e) {}
                                    }
                                    if (Array.isArray(node.material)) node.material.forEach(disposeMaterial)
                                    else disposeMaterial(node.material)
                                }
                            }
                        })

                        this.ui.hideSelectionUI()
                        this.selectedObject = null
                        this.selectedMesh = null
                        this.selectedMeshMaterial = null
                    }
                }
            } 
        })

        document.body.addEventListener('keyup', (event) => {
            if (event.key === 'r') {
                this.rotateSelectedObject = false
            }
        })

        this.renderer.domElement.addEventListener('mousemove', (event) => {
            if (this.moveSelectedObject && this.selectedObject != null) {
                const rect = this.renderer.domElement.getBoundingClientRect()
                const mouse = new THREE.Vector2(
                    ((event.clientX - rect.left) / rect.width) * 2 - 1,
                    -((event.clientY - rect.top) / rect.height) * 2 + 1
                )
                const raycaster = new THREE.Raycaster();
                raycaster.setFromCamera(mouse, this.camera.camera);
                const intersects = raycaster.intersectObject(this.scene.ground, true);
                if (intersects.length > 0) {
                    this.selectedMesh.position.copy(intersects[0].point);
                    this.ui.updateSelectionUI(this.selectedMesh)
                }
            }
            else if (this.rotateSelectedObject && this.selectedMesh != null) {
                const deltaX = event.movementX || 0
                const quaternion = new THREE.Quaternion()
                quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), deltaX * this.rotateSensitivity)
                this.selectedMesh.quaternion.multiplyQuaternions(quaternion, this.selectedMesh.quaternion)
                this.ui.updateSelectionUI(this.selectedMesh)
            }
        })

        const importInput = document.createElement('input')
        importInput.type = 'file'
        importInput.accept = '.json,application/json'
        importInput.style.display = 'none';
        document.body.appendChild(importInput)
        importInput.addEventListener('change', async (event) => {
            await this.scene.importScene(event, { skybox : this.skyboxParams, ground: this.groundParams})
            importInput.value = ''
        });

        this.renderer.setAnimationLoop(this.render.bind(this))
    }

    async addPrimitive(type, params) {
        let geometry = null
        const color = params.color || '#ffffff'
        try {
            switch (type) {
                case 'Box':
                    geometry = new THREE.BoxGeometry(params.size, params.size, params.size)
                    break
                case 'Sphere':
                    geometry = new THREE.SphereGeometry(params.radius, 32, 16)
                    break
                case 'Cylinder':
                    geometry = new THREE.CylinderGeometry(params.radius, params.radius, params.height, 32)
                    break
                case 'Cone':
                    geometry = new THREE.ConeGeometry(params.radius, params.height, 32)
                    break
                case 'Plane':
                    geometry = new THREE.PlaneGeometry(params.size, params.size)
                    break
                default:
                    console.warn('Unknown primitive type', type)
                    return
            }

            const material = new THREE.MeshStandardMaterial({ color: new THREE.Color(color) })
            const mesh = new THREE.Mesh(geometry, material)

            // position mesh so it's visible (place on ground or above origin)
            if (type === 'Plane') mesh.position.set(0, 0.01, 0)
            else if (type === 'Sphere') mesh.position.set(0, params.radius, 0)
            else if (type === 'Box') mesh.position.set(0, params.size / 2, 0)
            else mesh.position.set(0, params.height ? params.height / 2 : 1, 0)

            mesh.name = type
            mesh.castShadow = true
            mesh.receiveShadow = true

            // mark selectable
            mesh.traverse(o => {
                if (o.isMesh) {
                    o.userData = { isSelectable: true, object: mesh }
                }
            })

            this.scene.scene.add(mesh)

            // auto-select the new mesh
            this.selectedMesh = mesh
            this.selectedObject = mesh
            this.ui.updateSelectionUI(this.selectedMesh)
            this.highlightSelection(this.selectedMesh)
        } catch (err) {
            console.error('Failed to create primitive', err)
        }
    }

    async addModel(name) {
        try {
            const mesh = await loadGltf(name)
            mesh.position.set(0, 1, 0)
            mesh.name = name
            mesh.traverse(o => {
                if (o.isMesh) {
                    o.userData = {
                        isSelectable: true,
                        object: mesh,
                    }
                    o.castShadow = true
                    o.receiveShadow = true
                }
            })
            this.scene.scene.add(mesh)
            this.scene.models[name] = mesh
        } catch (err) {
            console.error('Failed to load model', name, err)
            alert('Failed to load model: ' + name)
        }
    }

    render() {
        this.renderer.shadowMap.enabled = true
        this.scene.helper.update()
        this.camera.process(this.globalParams)
        this.renderer.render(this.scene.scene, this.camera.camera)
    }

    clearHighlight() {
        if (!this._originalMaterials || this._originalMaterials.length === 0) return
        for (const entry of this._originalMaterials) {
            try {
                entry.node.material = entry.material
            } catch (e) {}
            if (entry.node.userData) delete entry.node.userData._highlighted
        }
        this._originalMaterials = []
    }

    highlightSelection(rootMesh) {
        if (!rootMesh) return
        this._originalMaterials = []
        rootMesh.traverse((node) => {
            if (node.isMesh) {
                const origMat = node.material
                this._originalMaterials.push({ node: node, material: origMat })
                try {
                    const highlightMat = Array.isArray(origMat) ? origMat.map(m => m.clone()) : origMat.clone()
                    const applyColor = (m) => {
                        try {
                            if ('emissive' in m) {
                                m.emissive = new THREE.Color(0x00ff88)
                                m.emissiveIntensity = 0.6
                            } else if ('color' in m) {
                                m.color = new THREE.Color(0x00ff88)
                            }
                        } catch (e) {}
                    }
                    if (Array.isArray(highlightMat)) highlightMat.forEach(applyColor)
                    else applyColor(highlightMat)
                    node.material = highlightMat
                    node.userData._highlighted = true
                } catch (e) {
                    // ignore
                }
            }
        })
    }

    initParams() {
        this.groundTextures = [
            'aerial_grass_rock',
            'brown_mud_leaves_01',
            'forest_floor',
            'forrest_ground_01',
            'gravelly_sand'
        ]

        this.groundParams = {
            texture: this.groundTextures[0],
            repeats: 100,
        }

        this.skyboxFiles = [
            'DaySkyHDRI019A_2K-TONEMAPPED.jpg',
            'DaySkyHDRI050A_2K-TONEMAPPED.jpg',
            'NightSkyHDRI009_2K-TONEMAPPED.jpg'
        ]

        this.skyboxParams = {
            file: this.skyboxFiles[0],
        }

        this.globalParams = {
            useWASD: false,
        }
    }
}