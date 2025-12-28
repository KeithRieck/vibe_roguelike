
import { TileType, Position, MAP_WIDTH, MAP_HEIGHT } from '../types';

export class DungeonGenerator {
  public tiles: TileType[][] = [];

  constructor() {
    this.reset();
  }

  private reset() {
    this.tiles = Array(MAP_HEIGHT).fill(0).map(() => Array(MAP_WIDTH).fill(TileType.WALL));
  }

  public generate(): { spawn: Position, exit: Position } {
    this.reset();
    
    const rooms: { x: number, y: number, w: number, h: number }[] = [];
    const maxRooms = 8;
    
    for (let i = 0; i < maxRooms; i++) {
      const w = Math.floor(Math.random() * 6) + 4;
      const h = Math.floor(Math.random() * 6) + 4;
      const x = Math.floor(Math.random() * (MAP_WIDTH - w - 2)) + 1;
      const y = Math.floor(Math.random() * (MAP_HEIGHT - h - 2)) + 1;

      const newRoom = { x, y, w, h };
      const overlaps = rooms.some(r => 
        newRoom.x < r.x + r.w + 1 &&
        newRoom.x + newRoom.w + 1 > r.x &&
        newRoom.y < r.y + r.h + 1 &&
        newRoom.y + newRoom.h + 1 > r.y
      );

      if (!overlaps) {
        this.addRoom(newRoom);
        if (rooms.length > 0) {
          this.connectRooms(rooms[rooms.length - 1], newRoom);
        }
        rooms.push(newRoom);
      }
    }

    const spawn = { 
      x: rooms[0].x + Math.floor(rooms[0].w / 2), 
      y: rooms[0].y + Math.floor(rooms[0].h / 2) 
    };

    const lastRoom = rooms[rooms.length - 1];
    const exit = { 
      x: lastRoom.x + Math.floor(lastRoom.w / 2), 
      y: lastRoom.y + Math.floor(lastRoom.h / 2) 
    };

    this.tiles[exit.y][exit.x] = TileType.STAIRS;

    return { spawn, exit };
  }

  private addRoom(room: { x: number, y: number, w: number, h: number }) {
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        this.tiles[y][x] = TileType.FLOOR;
      }
    }
  }

  private connectRooms(r1: any, r2: any) {
    const cx1 = Math.floor(r1.x + r1.w / 2);
    const cy1 = Math.floor(r1.y + r1.h / 2);
    const cx2 = Math.floor(r2.x + r2.w / 2);
    const cy2 = Math.floor(r2.y + r2.h / 2);

    // L-shaped corridor
    if (Math.random() > 0.5) {
      this.hLine(cx1, cx2, cy1);
      this.vLine(cy1, cy2, cx2);
    } else {
      this.vLine(cy1, cy2, cx1);
      this.hLine(cx1, cx2, cy2);
    }
  }

  private hLine(x1: number, x2: number, y: number) {
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
      this.tiles[y][x] = TileType.FLOOR;
    }
  }

  private vLine(y1: number, y2: number, x: number) {
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
      this.tiles[y][x] = TileType.FLOOR;
    }
  }
}
