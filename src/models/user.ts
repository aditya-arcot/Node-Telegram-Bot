import mongoose, { Schema } from 'mongoose'

const userSchema = new Schema({
    _id: { type: Number },
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    isActive: { type: Boolean, required: true },
})

export const User = mongoose.model('User', userSchema)
