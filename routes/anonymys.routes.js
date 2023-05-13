const AnonymysModel=require('../models/anonymys.model')
const express=require('express')
const ip=require('ip')
const anonymysrouter=express.Router()
const { firebase } = require("../config/db");
// const { pollDataToUser, decryptToken, pollToArray } = require("../utils/utils");
const fireDb = firebase.database();

anonymysrouter.post("/vote", async (req, res) => {
    const { pollId, selectedAnswers, pollData, pollName } = req.body;
    const userId=ip.address()+pollId;
    const pollRef = firebase.database().ref("polls/" + pollId);
  
    pollRef.child("usersAttended").once("value", async function (snapshot) {
      const usersAttended = snapshot.val() || [];
  
      
  
      if (Object.values(usersAttended).includes(userId.toString())) {
        res.status(208).send("User already voted for this poll");
      } else {
        pollRef.child("usersAttended").push(userId.toString());
  
        pollData.questions.forEach((question, questionId) => {
          const options = question.options.filter(
            (option, optionId) => selectedAnswers.find(a => a.questionId == questionId)?.optionsIds?.includes(optionId)
          );
  
          options.forEach(option => {
            option.votes++;
            if (option.votedBy == null) {
              option.votedBy = [];
            }
            option.votedBy.push({
              email: "anonymous",
              userId: userId,
              fullName: "Anonymous",
            });
          });
  
          question.totalVotes += options.length;
        });
  
        pollRef
          .update(pollData)
          .then(() => {
            res.status(200).send("Vote recorded successfully");
          })
          .catch((error) => {
            res.status(500).send(`Error recording vote: ${error}`);
          });
      }
    });
  });


  module.exports=anonymysrouter