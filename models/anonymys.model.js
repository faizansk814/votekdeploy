const mongoose=require('mongoose')

const anonymysschema=mongoose.Schema({
    userIp:String
})

const AnonymysModel=mongoose.model('anonymys',anonymysschema)

module.exports=AnonymysModel