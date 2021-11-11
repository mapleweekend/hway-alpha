if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

const cors = require('cors')

const express = require('express')
const app = express()
const expressLayouts = require('express-ejs-layouts')
const bcrypt = require('bcryptjs')
const cookieParser = require('cookie-parser')
const { response } = require('express');
const path = require('path');
const fs = require('fs');

app.use(cookieParser())

const users = []
IDs = []
topicArray = []
topicCount = []
postsonpage = []
postsPerPage = 30;


app.set('view engine', 'ejs')
app.set('views', __dirname + '/views')
app.set('layout', 'layouts/layout')
app.use(cors());
app.use(express.json())
app.use(expressLayouts)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static('public'));

const mongoose = require('mongoose')
mongoose.connect(process.env.DATEBASE_URL, {
	useUnifiedTopology: true
})
const connection = mongoose.connection;

connection.once("open", function() {
  //console.log("MongoDB database connection established successfully");
});

const User = require('./models/user')
const Post = require('./models/post')
const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET

const bp = require('body-parser')
app.use(bp.json())
app.use(bp.urlencoded({ extended: true }))

app.get('/', (req, res) => {
    res.render('index.ejs', {topic:""})
})

app.get('/logout', (req, res) => {
	res.cookie('token', '', { maxAge: 1 })
	res.render('index.ejs', {topic:""})
})

app.get('/api/get/currentuser', function (req, res) {
	try {
		token = req.cookies.token
		const verified = jwt.verify(token, process.env.JWT_SECRET)
		//console.log(verified)
		res.json(verified)
	} catch (err) {
		return res.json({ status:"error", code:400, error: err})
	}
})

app.get('/login', (req, res) => {
    res.render('login.ejs', {topic:"- login"})
})

app.get('/register', (req, res) => {
    res.render('register.ejs', {topic:"- register"})
})

app.get('/home', async(req, res) => {
	valid = await isloggedin(req)
	
	if (valid) {
		res.render('home.ejs', {topic: "- all"})
	} else {
		res.render('login.ejs', {topic:"- login"})
	}
})

app.get('/h/:topic', async(req,res) => {
	res.render('home.ejs', {topic:"- "+req.params.topic})
})

app.get('/posts/:postid', async(req,res) => {	
	res.render('home.ejs', {topic:""})
})

app.get('/api/get/posts/:postid', async(req,res) => {	
	Post.findById(req.params.postid, function (err, post) {
		res.send(post)
	})
})

app.get('/api/get/:topic/:page', async(req, res) => {	
	postsonpage = []

	try {
		token = req.cookies.token
		const verified = jwt.verify(token, process.env.JWT_SECRET)
		//console.log(verified)
		userID = verified.id
	} catch (err) {
		return res.json({ status:"error", code:400, error: err})
	}
	
	if (req.params.topic == "all") {
		Post.find({}).sort({total_votes: -1}).exec(function(err, posts){
			if(err){
			  //console.log(err);
			} else{
				for (i=0;i<posts.length;i++) {
					if (posts[i].posterID == userID) {
						postsonpage[i] = posts[i]
						postsonpage[i].current_user_admin = true
					} else {
						postsonpage[i] = posts[i]
						postsonpage[i].current_user_admin = false
					}
					if (posts[i].users_upvoted.includes(userID)) {
						postsonpage[i].current_user_upvoted = true
						postsonpage[i].current_user_downvoted = false
					}
					if (posts[i].users_downvoted.includes(userID)) {
						postsonpage[i].current_user_upvoted = false
						postsonpage[i].current_user_downvoted = true
					}
				}
				res.send(postsonpage)
			}
		})
	} else {
		Post.find({topic: req.params.topic}).sort({total_votes: -1}).exec(function(err, posts){
			if(err){
			  //console.log(err);
			} else{
				for (i=0;i<posts.length;i++) {
					if (posts[i].posterID == userID) {
						postsonpage[i] = posts[i]
						postsonpage[i].current_user_admin = true
					} else {
						postsonpage[i] = posts[i]
						postsonpage[i].current_user_admin = false
					}
					if (posts[i].users_upvoted.includes(userID)) {
						postsonpage[i].current_user_upvoted = true
						postsonpage[i].current_user_downvoted = false
					}
					if (posts[i].users_downvoted.includes(userID)) {
						postsonpage[i].current_user_upvoted = false
						postsonpage[i].current_user_downvoted = true
					}
				}
				res.send(postsonpage)
			}
		})
	}

	
})

app.get('/api/get/users', async(req, res) => {	
	User.find({}, function(err, users){
        if(err){
          //console.log(err);
        } else{
			
            res.send(users)
        }
    })
})

app.get('/api/get/topics', async(req, res) => {	
	topicArray = []
	topicCount = []
	Post.find({}, function(err, posts){
        if(err){
          //console.log(err);
        } else{
			
			for (i=0;i<posts.length;i++) {
				if (topicArray.includes(posts[i].topic)) {
					index = topicArray.indexOf(posts[i].topic)
					topicCount[index] = parseInt(topicCount[index]+1)
				} else {
					topicArray.push(posts[i].topic)
					topicCount[i] = 1
				}
				if (topicCount[i] == null) {
					topicCount[i] = 1
				}
			}
			var joinedArray = topicArray.map(function (value, index){
				return [value, topicCount[index]]
			});
			joinedArray.sort(function(a,b) {
				return b[1] - a[1]
			})
			//console.log(joinedArray)
			res.send(joinedArray)
        }

    })
})

app.post('/login', async(req, res) => {
    const { name, password } = req.body
	const user = await User.findOne({ name }).lean()

	if (!user) {
		return res.json({ status: 'error', error: 'Invalid username/password' })
	}

	if (await bcrypt.compare(password, user.password)) {
		const token = jwt.sign(
			{
				id: user._id,
				name: user.name
			},
			JWT_SECRET, { expiresIn: "30days"}
		)

        res.cookie("token", token, {
            httpOnly: true
        })

		return res.json({ status: 'ok', code: 200, data: token })
	}

	res.json({ status: 'error', code: 400, error: 'Invalid username/password' })
})

app.post('/register', async(req, res) => {
    const { name, password: plainTextPassword} = req.body
    const password = await bcrypt.hash(plainTextPassword, 10)

    try {
		const response = await User.create({
            name: name,
            password: password
		})
		//console.log('User created successfully: ', response)
	} catch (error) {
		if (error.code === 11000) {
			// duplicate key
			return res.json({ status: 'error', code: 400, error: 'Username already in use' })
		} else {
            return res.json({ status: 'error', code:400, error: 'Unknown error code'})
        }
		throw error
	}

	res.json({ status: 'ok', code:200 })
})

app.post('/api/post/post', async(req, res) => {
	const {title, body, link, topic, type} = req.body

	try {
		token = req.cookies.token
		const verified = jwt.verify(token, process.env.JWT_SECRET)
		//console.log(verified)
		userID = verified.id
		poster = verified.name
	} catch (err) {
		return res.json({ status:"error", code:400, error: err})
	}

	let post_datetime = new Date()
	month = post_datetime.getMonth()+1
	day = post_datetime.getDate()
	year = post_datetime.getFullYear()
	hour = post_datetime.getHours()
	minute = post_datetime.getMinutes()
	timestamp = Date.now()

	if (hour > 12) {
		ampm = "PM"
		hour -= 12
	} else {
		ampm = "AM"
	}
	if (minute < 10) {
		minute = "0"+minute
	}

	fulldatetime = month+"/"+day+"/"+year+" at "+hour+":"+minute+" "+ampm

	try {
		const response = await Post.create({
            title: title, 
			body: body, 
			poster: poster,
			link: link,
			topic: topic,
			type: 1, // 1=text, using as temporary default
			posterID: userID,
			date: fulldatetime,
			timestamp:timestamp
		})
		//console.log('Post created successfully: ', response)
		res.json({ status:"ok", code:200, data: response})
	} catch (error) {
		//console.log(error)
		res.json(error)
	}
})


app.post('/api/post/comment/', async(req, res) => {
	const {body:reqbody, id} = req.body
	console.log(id)

	try {
		token = req.cookies.token
		const verified = jwt.verify(token, process.env.JWT_SECRET)
		//console.log(verified)
		userID = verified.id
		
		username = verified.name
	} catch (err) {
		return res.json({ status:"error", code:400, error: err})
	}

	let post_datetime = new Date()
	month = post_datetime.getMonth()+1
	day = post_datetime.getDate()
	year = post_datetime.getFullYear()
	hour = post_datetime.getHours()
	minute = post_datetime.getMinutes()
	timestamp = Date.now()

	if (hour > 12) {
		ampm = "PM"
		hour -= 12
	} else {
		ampm = "AM"
	}
	if (minute < 10) {
		minute = "0"+minute
	}

	fulldatetime = month+"/"+day+"/"+year+" at "+hour+":"+minute+" "+ampm

	try {
		Post.findById(id, function(err, docs) {
			console.log(docs)
			commentArray = docs.comments
			newComment = {
				'body': reqbody,
				'poster':username,
				'posterID': userID,
				'date': fulldatetime,
				'timestamp':timestamp,
				'total_votes':0,
				'users_voted':[],
				'_id': Math.floor(Math.random() * Date.now()) // generates a random id
			}
			commentArray.push(newComment)
			docs.comments = commentArray
			docs.save()
			res.json(newComment)
		})
	} catch(err) {
		res.send(err)
	}
	
})


function isloggedin(req) {
	try {
		token = req.cookies.token
		const verified = jwt.verify(token, process.env.JWT_SECRET)
		//console.log("verified:"+JSON.stringify(verified))
		if (JSON.stringify(verified).status == "error") {
			return false
		} else {
			return true
		}
	} catch(err) {
		return false
	}
}

app.put('/vote/:id/:y', function(req,res) {
	id = (req.params.id).substring(13)
	change = req.params.y

	try {
		token = req.cookies.token
		const verified = jwt.verify(token, process.env.JWT_SECRET)
		//console.log(verified)
		userID = verified.id
		//console.log("id:"+userID)
	} catch (err) {
		return res.json({ status:"error", code:400, error: err})
	}

	try {
		Post.findOne({_id: id }, function (err, docs) { 
			oldtotal_votes = docs.total_votes
			oldupvotes = parseInt(docs.upvotes)
			olddownvotes = parseInt(docs.downvotes)	

			if (change == 1) { // upvoting
				Post.findOneAndUpdate({ _id: id }, { $set: {upvotes: (oldupvotes+1), total_votes: (oldtotal_votes+1)}, $push: {users_upvoted: userID}, $pull: {users_downvoted: userID} }, {}, function (err, numReplaced) {

				})
			}
			if (change == -1) { // downvoting
				Post.findOneAndUpdate({ _id: id }, { $set: {downvotes: (olddownvotes+1), total_votes: (oldtotal_votes-1)}, $push: {users_downvoted: userID}, $pull: {users_upvoted: userID} }, {}, function (err, numReplaced) {
					
				})
			}
			Post.findOne({_id: id }, function (err, docs) { 
				upArray = docs.users_upvoted
				downArray = docs.users_downvoted
				newUp = upArray.filter(function(item, pos) {
					return upArray.indexOf(item) == pos;
				})
				newDown = downArray.filter(function(item, pos) {
					return downArray.indexOf(item) == pos;
				})
				Post.findOneAndUpdate({ _id: id }, { $set: {users_upvoted: newUp, users_downvoted: newDown}}, {}, function (err, numReplaced) {
					res.send({ status:"ok", code:200})
				})
			})
		})
	} catch(err) {
	}
})

app.put('/voteComment/:parentid/:commentid', function(req,res) {
	pID = req.params.parentid
	id = req.params.commentid
	console.log("id:"+id)
	try {
		token = req.cookies.token
		const verified = jwt.verify(token, process.env.JWT_SECRET)
		userID = verified.id
		console.log(userID)
	} catch (err) {
		return res.json({ status:"error", code:400, error: err})
	}

	try {
		Post.findById(pID, function(err, docs) {
			oldComArray = docs.comments

			for (i=0;i<oldComArray.length;i++) {
				if (oldComArray[i]._id == id) {
					console.log("match:"+i)
					index = i
				}
			}
			oldVotes = oldComArray[index].total_votes
			newVotes = oldVotes+1
			
			if (oldComArray[index].users_voted.includes(userID)) {
				res.json({"failure, user already voted":404})
			} else {
				oldComArray[index].users_voted.push(userID)
				oldComArray[index].total_votes = newVotes
				console.log(oldComArray)
				Post.findByIdAndUpdate(pID, {comments: oldComArray}, function(err, docs) {	
					docs.save()
					res.json({"status":'ok'})
				})
			}
		})
		
	} catch (err) {

	}

})

app.listen(process.env.PORT || 3000)