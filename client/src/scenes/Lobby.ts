import MyPlayer from '../characters/MyPlayer'
import PlayerSelector from '../characters/PlayerSelector'
import Network from '../services/Network'
import { createCharacterAnims } from '../anims/CharacterAnims'
import { createItemAnims } from '../anims/ItemAnims'

export default class Lobby extends Phaser.Scene {
  network!: Network
  myPlayer!: MyPlayer
  private playerSelector!: Phaser.GameObjects.Zone
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private keyE!: Phaser.Input.Keyboard.Key
  private keyR!: Phaser.Input.Keyboard.Key
  private map!: Phaser.Tilemaps.Tilemap

  constructor() {
    super('lobby')
  }

  registerKeys() {
    this.cursors = this.input.keyboard.createCursorKeys()
    // maybe we can have a dedicated method for adding keys if more keys are needed in the future
    this.keyE = this.input.keyboard.addKey('E')
    this.keyR = this.input.keyboard.addKey('R')
    this.input.keyboard.disableGlobalCapture()
  }

  preload() {
    this.load.tilemapTiledJSON('lobby_map', 'assets/map/lobby.json')
    this.load.spritesheet('upstairs', 'assets/items/UpstairsConnectorsStairsAndOthers.png', {
      frameWidth: 32,
      frameHeight: 32,
    })
    this.load.spritesheet('glassdoor', 'assets/items/glassdoor.png', {
      frameWidth: 32,
      frameHeight: 64,
    })
    this.load.spritesheet('escalator', 'assets/items/escalator.png', {
      frameWidth: 96,
      frameHeight: 160,
    })
  }

  create(data: { network: Network }) {
    if (!data.network) {
      throw new Error('server instance missing')
    } else {
      this.network = data.network
    }

    createCharacterAnims(this.anims)
    createItemAnims(this.anims)

    this.map = this.make.tilemap({ key: 'lobby_map' })
    const FloorAndGround = this.map.addTilesetImage('FloorAndGround', 'tiles_wall')
    const Upstairs = this.map.addTilesetImage('UpstairsConnectorsStairsAndOthers', 'upstairs')

    const groundLayer = this.map
      .createLayer('Ground', FloorAndGround)
      .setDepth(-10000)
      .setCollisionByProperty({ collides: true })

    const lowDepthLayer = this.map
      .createLayer('LowDepth', Upstairs)
      .setDepth(-10000)
      .setCollisionByProperty({ collides: true })

    this.map.createLayer('MidDepth', Upstairs).setDepth(-5000)
    this.map.createLayer('HighDepth', FloorAndGround).setDepth(10000)

    const collidergroup = this.physics.add.staticGroup()
    const colliderLayer = this.map.getObjectLayer('Colliders')
    colliderLayer.objects.forEach((object) => {
      const { x, y, width, height } = object
      const collisionRegion = this.add.rectangle(x, y, width, height).setOrigin(0)
      collidergroup.add(collisionRegion)
    })

    const escalatorGroup = this.physics.add.staticGroup()
    const objectLayer = this.map.getObjectLayer('Escalators')
    objectLayer.objects.forEach((object) => {
      const { x, y, width, height } = object
      const actualX = x! + width! * 0.5
      const actualY = y! - height! * 0.5

      // custom properties[0] is the object direction specified in Tiled
      const direction = object.properties[0].value
      const escalator = escalatorGroup
        .get(actualX, actualY)
        .setDepth(actualY - height! * 0.5)
        .anims.play(`escalator_${direction}`)
        .setOffset(4, -32)
      escalator.body.width = width! * 0.25
      escalator.body.height = height! * 0.75
    })

    this.addGroupFromTiled('UpstairsObjects', 'upstairs', 'UpstairsConnectorsStairsAndOthers')
    this.addGroupFromTiled('Glassdoor', 'glassdoor', 'glassdoor')

    this.myPlayer = this.add.myPlayer(0, 100, 'adam', '123')
    this.playerSelector = new PlayerSelector(this, 0, 0, 16, 16)

    this.cameras.main.zoom = 1.5
    this.cameras.main.startFollow(this.myPlayer, true)
    this.physics.add.collider([this.myPlayer, this.myPlayer.playerContainer], collidergroup)
    this.physics.add.collider(
      [this.myPlayer, this.myPlayer.playerContainer],
      [groundLayer, lowDepthLayer]
    )

    this.physics.add.overlap(
      this.myPlayer,
      escalatorGroup,
      this.handlePlayerEscalatorOverlap,
      undefined,
      this
    )
  }

  update() {
    if (this.myPlayer && this.network) {
      this.playerSelector.update(this.myPlayer, this.cursors)
      this.myPlayer.update(this.playerSelector, this.cursors, this.keyE, this.keyR, this.network)
    }
  }

  private addGroupFromTiled(objectLayerName: string, key: string, tilesetName: string) {
    const group = this.physics.add.staticGroup()
    const objectLayer = this.map.getObjectLayer(objectLayerName)
    objectLayer.objects.forEach((object) => {
      const actualX = object.x! + object.width! * 0.5
      const actualY = object.y! - object.height! * 0.5
      group
        .get(actualX, actualY, key, object.gid! - this.map.getTileset(tilesetName).firstgid)
        .setDepth(actualY)
    })
  }

  private handlePlayerEscalatorOverlap(myPlayer, escalator) {
    if (!myPlayer.escalatorOnTouch) myPlayer.escalatorOnTouch = escalator
  }
}
