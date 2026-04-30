import Database from 'better-sqlite3';

export type FileRow = {
    uuid: string,
    hash: string,
    path: string | null,
    dirty?: boolean
}
export type AssetRow = {
    uuid: string,
    fileId: string,
    hash: string,
    type: "other" | "image" | "mesh" | "prefab",
    name: string,
    property: string
}

export const db = new Database("lite3.db", {  });
db.pragma('journal_mode = WAL');
db.exec(`
    CREATE TABLE IF NOT EXISTS files(
        uuid TEXT PRIMARY KEY,
        hash TEXT,
        path TEXT
    );
    CREATE TABLE IF NOT EXISTS assets(
        uuid TEXT PRIMARY KEY,
        fileId TEXT,
        hash TEXT,
        type TEXT,
        name TEXT,
        property TEXT,
        FOREIGN KEY (fileId) REFERENCES files(uuid) ON DELETE CASCADE
    );
`);

export const filesQuery = {
    gets: db.prepare("SELECT * FROM files"),
    updatePath: db.prepare(`
        UPDATE files
        SET path = ?
        WHERE uuid = ?
    `),
    updateHash: db.prepare(`
        UPDATE files
        SET hash = ?
        WHERE uuid = ?
    `),
    insert: db.prepare(`
        INSERT INTO files (uuid, hash, path)
        VALUES (?, ?, ?);
    `),
    delete: db.prepare(`
        DELETE FROM files WHERE uuid = ?
    `),
}

export const assetsQuery = {
    gets: db.prepare("SELECT * FROM assets"),
    delete: db.prepare("DELETE FROM assets WHERE uuid = ?"),
    deletesTransaction: db.transaction((ids: string[]) => {
        for(const id of ids) assetsQuery.delete.run(id);
    }),
    insert: db.prepare(`
        INSERT INTO assets (uuid, fileId, hash, type, name, property)
        VALUES (?, ?, ?, ?, ?, ?);    
    `),
    updateHash: db.prepare(`
        UPDATE assets
        SET hash = ?
        WHERE uuid = ?
    `),
    updateName: db.prepare(`
        UPDATE assets
        SET name = ?
        WHERE uuid = ?
    `)
}
