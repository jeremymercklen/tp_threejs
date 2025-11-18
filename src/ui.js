import GUI from 'lil-gui';

export class UI {
    constructor(){
        this.gui = new GUI()
        
        this.infoFolder = null
        this.transformFolder = null
        this.scaleXController = null
        this.scaleYController = null
        this.scaleZController = null
    }

    addWASDControls(params, onChange) {
        this.gui.add(params, 'useWASD').name('WASD Mode').onChange(onChange)
    }

    addCameraUI(params, onChange) {
        const folder = this.gui.addFolder('Camera')
        folder.add(params, 'fov', 30, 120).name('FOV').onChange(onChange)
    }

    addSceneUI(onExport, onImport, onClear) {
        const folder = this.gui.addFolder('Scene')
        folder.add({export: onExport}, 'export').name('Export Scene to JSON')
        folder.add({import: onImport}, 'import').name('Import Scene from JSON')
        folder.add({clear: onClear}, 'clear').name('Clear Scene')
    }

    addSkyboxUI(file, params, onChange) {
        const folder = this.gui.addFolder('Skybox')
        folder.add(params, 'file', file).name('File').onChange(onChange)
    }

    addModelsUI(models, onAdd) {
        const folder = this.gui.addFolder('Models')
        const params = { model: Array.isArray(models) ? models[0] : models[0] }
        folder.add(params, 'model', models).name('Model')
        folder.add({ add: () => onAdd(params.model) }, 'add').name('Add Model to Scene')
    }

    addGroundUI(textures, params, onChange) {
        const folder = this.gui.addFolder('Ground')
        folder.add(params, 'texture', textures).name('Texture').onChange(onChange)
        folder.add(params, 'repeats', 1, 500).name('Repeats').onChange(onChange)
    }

    addSunUI(params, onChange) {
        const folder = this.gui.addFolder('Sun Light')
        folder.addColor(params, 'color').name('Color').onChange(onChange)
        folder.add(params, 'intensity', 0, 5).name('Intensity').onChange(onChange)
        folder.add(params.position, 'x', -100, 100).name('Position X').onChange(onChange)
        folder.add(params.position, 'z', -100, 100).name('Position Z').onChange(onChange)
    }

    addSelectionUI() {
        this.infoFolder = this.gui.addFolder('Selected')
        this.infoMessages = { 
            name: '--' ,
            position: '--',
            rotation: '--',
            scale: '--',
        }
        this.infoName = this.infoFolder.add(this.infoMessages, 'name').disable()
        this.infoPos = this.infoFolder.add(this.infoMessages, 'position').name('position').disable()
        this.infoRot = this.infoFolder.add(this.infoMessages, 'rotation').name('rotation').disable()
        this.infoScale = this.infoFolder.add(this.infoMessages, 'scale').name('scale').disable()
        this.transformFolder = this.infoFolder.addFolder('Transform')
        this.scaleXController = null
        this.scaleYController = null
        this.scaleZController = null

        this.hideSelectionUI()
    }

    updateSelectionUI(selectedObject) {
        this.infoMessages.name = selectedObject.name
        this.infoMessages.position = `${selectedObject.position.x.toFixed(2)}, ${selectedObject.position.y.toFixed(2)}, ${selectedObject.position.z.toFixed(2)}`
        this.infoMessages.rotation = `${selectedObject.rotation.x.toFixed(2)}, ${selectedObject.rotation.y.toFixed(2)}, ${selectedObject.rotation.z.toFixed(2)}`
        this.infoMessages.scale = `${selectedObject.scale.x.toFixed(2)}, ${selectedObject.scale.y.toFixed(2)}, ${selectedObject.scale.z.toFixed(2)}`
        this.infoName.updateDisplay()
        this.infoPos.updateDisplay()
        this.infoRot.updateDisplay()
        this.infoScale.updateDisplay()
        if (this.scaleXController) { try { this.scaleXController.destroy() } catch(e){}; this.scaleXController = null }
        if (this.scaleYController) { try { this.scaleYController.destroy() } catch(e){}; this.scaleYController = null }
        if (this.scaleZController) { try { this.scaleZController.destroy() } catch(e){}; this.scaleZController = null }

        this.scaleXController = this.transformFolder.add(selectedObject.scale, 'x', 0.01, 10).name('Scale X').onChange((v) => {
            selectedObject.scale.x = v
            this.infoMessages.scale = `${selectedObject.scale.x.toFixed(2)}, ${selectedObject.scale.y.toFixed(2)}, ${selectedObject.scale.z.toFixed(2)}`
            this.infoScale.updateDisplay()
        })
        this.scaleYController = this.transformFolder.add(selectedObject.scale, 'y', 0.01, 10).name('Scale Y').onChange((v) => {
            selectedObject.scale.y = v
            this.infoMessages.scale = `${selectedObject.scale.x.toFixed(2)}, ${selectedObject.scale.y.toFixed(2)}, ${selectedObject.scale.z.toFixed(2)}`
            this.infoScale.updateDisplay()
        })
        this.scaleZController = this.transformFolder.add(selectedObject.scale, 'z', 0.01, 10).name('Scale Z').onChange((v) => {
            selectedObject.scale.z = v
            this.infoMessages.scale = `${selectedObject.scale.x.toFixed(2)}, ${selectedObject.scale.y.toFixed(2)}, ${selectedObject.scale.z.toFixed(2)}`
            this.infoScale.updateDisplay()
        })
        this.infoFolder.show()
        this.transformFolder.show()
    }

    hideSelectionUI() {
        this.infoFolder.hide()
        if (this.transformFolder) this.transformFolder.hide()
    }
}