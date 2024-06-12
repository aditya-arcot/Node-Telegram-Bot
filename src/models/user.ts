import mongoose, { Schema } from 'mongoose'

const userSchema = new Schema({
    _id: { type: Number },
    name: { type: String, required: true },
    username: { type: String, required: true },
})

export const User = mongoose.model('User', userSchema)

export const findUserById = async (id: number) => {
    return await User.findOne({ _id: id }).lean()
}
