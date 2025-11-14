import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
export class Camera {
    constructor(renderer, params) {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
        this.defaultPosition()

        this.controls = new OrbitControls(this.camera, renderer.domElement)
        this.controls.enableDamping = true
        this.controls.dampingFactor = 0.05
        this.controls.target.set(0, 0, 0)

        this.mouseSensitivity = 0.002
        this.yaw = 0;
        this.pitch = 0;
        this.isMouseCaptured = false;

        this.direction = new THREE.Vector2(0, 0)
        this.speed = 0.5

        renderer.domElement.addEventListener('click', () => {
            if (params.useWASD) {
                renderer.domElement.requestPointerLock?.() || 
                renderer.domElement.mozRequestPointerLock?.()
            }
        })
        
        document.addEventListener('pointerlockchange', () => {
            if (params.useWASD) {
                this.isMouseCaptured = document.pointerLockElement === renderer.domElement
            }
        })

        document.addEventListener('mozpointerlockchange', () => {
            if (params.useWASD) {
                this.isMouseCaptured = document.mozPointerLockElement === renderer.domElement
            }
        })

        document.addEventListener('keydown', (event) => {
            if (params.useWASD) {
                if (event.code === 'KeyW') this.direction.x = 1
                if (event.code === 'KeyS') this.direction.x = -1
                if (event.code === 'KeyA') this.direction.y = -1
                if (event.code === 'KeyD') this.direction.y = 1
            }   
        })

        document.addEventListener('keyup', (event) => {
            if (params.useWASD) {
                if (event.code === 'KeyW' || event.code === 'KeyS') this.direction.x = 0
                if (event.code === 'KeyA' || event.code === 'KeyD') this.direction.y = 0
            }
        })

        document.addEventListener('mousemove', (event) => {
            if (params.useWASD && this.isMouseCaptured) {
                this.yaw -= event.movementX * this.mouseSensitivity
                this.pitch -= event.movementY * this.mouseSensitivity
                this.pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.pitch))
                this.camera.rotation.order = 'YXZ'
                this.camera.rotation.y = this.yaw
                this.camera.rotation.x = this.pitch
            }
        })

        this.controls.update()
    }

    defaultPosition() {
        this.camera.position.z = 50
        this.camera.position.y = 20
        this.camera.lookAt(0, 0, 0)
    }

    toggleControls(params) {
        this.controls.enabled = !params.useWASD
        console.log('toggleControls', params.useWASD)
        if (params.useWASD) {
            this.defaultPosition()
        }
    }   

    process(params) {
        if (params.useWASD) {
            const forward = new THREE.Vector3()
            this.camera.getWorldDirection(forward)            
            const right = new THREE.Vector3(-forward.z, 0, forward.x).normalize()
            this.camera.position.addScaledVector(forward, this.direction.x * this.speed)
            this.camera.position.addScaledVector(right, this.direction.y * this.speed)
        }
    }

    defaultPosition() {
        this.camera.position.set(0, 20, 50)
    }
}