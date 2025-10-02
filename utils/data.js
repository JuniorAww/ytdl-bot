import fs from 'node:fs'

class Data {
    constructor(path) {
        this.path = path;
        if (!fs.existsSync(path)) this.data = {}
        else this.data = JSON.parse(fs.readFileSync(path));
    }
    
    async save() {
        fs.writeFileSync(this.path, JSON.stringify(this.data, null, 2))
    }
}

class Users extends Data {
    async getUser(ctx) {
        const { id, username, first_name } = ctx.from
        
        if (!this.data[id]) {
            this.data[id] = {
                id,
                name: first_name,
                tag: username,
                groups: {},
                level: [0, 50, 0]
            };
            save()
        }
        
        const user = this.data[id];
        return this.data[id];
    }
    
    async getUserById(id) {
        return this.data[id];
    }
    
    async get() {
        return JSON.parse(JSON.stringify(this.data))
    }
}

const users = new Users("data/users.json")

setInterval(async () => {
    await users.save();
    console.log('Сохранено')
}, 1000 * 30)

export { users };
export const save = async () => { await users.save(); };


