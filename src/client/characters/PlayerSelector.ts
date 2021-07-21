import Phaser from 'phaser'
import Player from './Player'
import { PlayerState } from './Player'
import Item from '../items/Item'

export default class PlayerSelector extends Phaser.GameObjects.Zone {
  private _selectedItem?: Item
  set selectedItem(item: Item | undefined) {
    this._selectedItem = item
  }
  get selectedItem() {
    return this._selectedItem
  }

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
    super(scene, x, y, width, height)

    scene.physics.add.existing(this)
  }

  update(player: Player, cursors: Phaser.Types.Input.Keyboard.CursorKeys) {
    if (!cursors) {
      return
    }

    // no need to update player selection while sitting
    if (player.playerState === PlayerState.SITTING) {
      return
    }

    // update player selection box position so that it's always in front of the player
    const { x, y } = player
    if (cursors.left?.isDown) {
      this.setPosition(x - 32, y)
    } else if (cursors.right?.isDown) {
      this.setPosition(x + 32, y)
    } else if (cursors.up?.isDown) {
      this.setPosition(x, y - 32)
    } else if (cursors.down?.isDown) {
      this.setPosition(x, y + 32)
    }
    /**
     * while currently selecting an item,
     * if the selector and selection item stop overlapping, clear the dialog box and selected item
     */
    if (this.selectedItem) {
      if (!this.scene.physics.overlap(this, this.selectedItem)) {
        this.selectedItem.clearDialogBox()
        this.selectedItem = undefined
      }
    }
  }
}