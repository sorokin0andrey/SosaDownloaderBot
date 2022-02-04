import { Low, JSONFile } from 'lowdb'

export interface IUser {
  id: number
  username?: string
  instagram: string
}

export interface IDatabaseData {
  users: { [x: number]: IUser }
}

export const db = new Low<IDatabaseData>(new JSONFile('db.json'))

export const initDB = async () => {
  await db.read()

  if (!db.data) {
    db.data = { users: {} }
  }
}

export const findUser = (userId: number): IUser | null => {
  const users = db.data?.users || {}

  return users[userId] || null
}

export const saveUser = async (user: IUser) => {
  if (!db.data) {
    return
  }

  db.data.users[user.id] = user

  await db.write()
}

export const deleteUser = async (userId: number) => {
  if (!db.data) {
    return
  }

  delete db.data.users[userId]

  await db.write()
}

export const getUsers = () => {
  const users = db.data?.users || {}
  
  return Object.values(users)
}

export const findUserByInstagram = (instagram: string): IUser | null => {

  return getUsers().find((user) => user.instagram === instagram) || null
}
