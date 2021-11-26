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

connection.once("open", function(res) {
  ////console.log"MongoDB database connection established successfully");
});


const User = require('./models/user')
const Post = require('./models/post')
const Guest = require('./models/guest')
const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET

const bp = require('body-parser')
app.use(bp.json())
app.use(bp.urlencoded({ extended: true }))

var allowUsersToBrowseAsGuests = true
var geoip = require('geoip-lite');

app.get('/', async(req, res) => {
	var ip = req.header('x-forwarded-for') || req.connection.remoteAddress;
	console.log(ip)
	try {
		Guest.findOne({ip_address:ip}, function(err, docs) {
			let datetime = new Date()
			month = datetime.getUTCMonth()+1
			day = datetime.getUTCDate()
			year = datetime.getUTCFullYear()
			hour = datetime.getUTCHours()
			minute = datetime.getUTCMinutes()
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

			fulldatetime = month+"/"+day+"/"+year+" at "+hour+":"+minute+" "+ampm+" UTC"
			if (docs != null) {
				docs.visited_num += 1
				if (!docs.visited_datetime_array.includes(fulldatetime)) {
					docs.visited_datetime_array.push(fulldatetime)
				}
				docs.save()
			} else {
				var geo = geoip.lookup(ip);
				try {
					Guest.create({
						ip_address: ip,
						approximate_location: geo,
						visited_datetime_array: [fulldatetime]
					})
				} catch(err) {
					console.log(err)
				}
			}
		})

		
	} catch(err) {
		console.log(err)
	}
	
    res.render('index.ejs', {topic:""})
	
})

app.get('/logout', (req, res) => {
	try {
		token = req.cookies.token
		const verified = jwt.verify(token, process.env.JWT_SECRET)
		userID = verified.id
		
		let datetime = new Date()
		month = datetime.getUTCMonth()+1
		day = datetime.getUTCDate()
		year = datetime.getUTCFullYear()
		hour = datetime.getUTCHours()
		minute = datetime.getUTCMinutes()
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

		fulldatetime = month+"/"+day+"/"+year+" at "+hour+":"+minute+" "+ampm+" UTC"

		User.findById(userID, function(err, docs) {
			docs.statistics.misc.logout_num += 1
			docs.statistics.misc.logout_array.push([fulldatetime, Date.now()])
			docs.save()
		})
	} catch (err) {
		return res.json({ status:"error", code:400, error: err})
	}
	res.cookie('token', '', { maxAge: 1 })
	res.render('index.ejs', {topic:""})
})

app.get('/api/get/currentuser', function (req, res) {
	try {
		token = req.cookies.token
		const verified = jwt.verify(token, process.env.JWT_SECRET)
		var ip = req.header('x-forwarded-for') || req.connection.remoteAddress;
			console.log(ip)
			if (ip.includes("ffff")) {
				console.log("Local IP detected.")
			} else {
				User.findById(verified.id, function(err, docs) {
					if (docs != null) {
						var geo = geoip.lookup(ip);
						try {
							if (!docs.statistics.misc.ip_address.includes(ip)) {
								docs.statistics.misc.ip_address.push(ip)
							}
							if (!docs.statistics.misc.approximate_location.includes(geo)) {
								docs.statistics.misc.approximate_location.push(geo)
							}
							docs.save()
						} catch(err) {
							console.log(err)
						}
					}
					
				})
			}
			
		res.json(verified)

	} catch (err) {
		try {
			var ip = req.header('x-forwarded-for') || req.connection.remoteAddress;
			console.log(ip)
			Guest.findOne({ip_address:ip}, function(err, docs) {
				let datetime = new Date()
				month = datetime.getUTCMonth()+1
				day = datetime.getUTCDate()
				year = datetime.getUTCFullYear()
				hour = datetime.getUTCHours()
				minute = datetime.getUTCMinutes()
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

				fulldatetime = month+"/"+day+"/"+year+" at "+hour+":"+minute+" "+ampm+" UTC"
				if (docs != null) {
					docs.visited_num += 1
					if (!docs.visited_datetime_array.includes(fulldatetime)) {
						docs.visited_datetime_array.push(fulldatetime)
					}
					docs.save()
				} else {
					var geo = geoip.lookup(ip);
					try {
						Guest.create({
							ip_address: ip,
							approximate_location: geo,
							visited_datetime_array: [fulldatetime]
						})
					} catch(err) {
						console.log(err)
					}
				}
			})
		} catch(err) {
			console.log(err)
		}
		return res.json({ status:"error", code:400, error: err})
	}

})

app.get('/login', (req, res) => {
    res.render('login.ejs', {topic:"- login"})
})

app.get('/users', (req, res) => {
    res.render('users.ejs', {topic:"- users"})
})
app.get('/user/:user', (req, res) => {
    res.render('home.ejs', {topic:"- "+req.params.user})
})

app.get('/register', (req, res) => {
    res.render('register.ejs', {topic:"- register"})
})

app.get('/home', async(req, res) => {
	valid = true
	// Commenting out below allows users to view the home without being logged in
	valid = await isloggedin(req)
	
	if (valid || allowUsersToBrowseAsGuests) {
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

app.get('/api/get/all_users/:sorting', async(req, res) =>{
	// Post.find({}).sort({total_votes: -1}).exec(function(err, posts){
	User.find({}, function(err, users) {
		if (req.params.sorting == '0') {
			users.sort(function(a, b){return a.statistics.score - b.statistics.score}); 
		}
		if (req.params.sorting == '1') {
			users.sort(function(a, b){return b.statistics.score - a.statistics.score}); 
		}
		
		usersArr = []
		locationArr = ""
		for (i=0;i<users.length;i++) {
			try {
				locationArr = users[i].statistics.misc.approximate_location[0]
				console.log(JSON.stringify(locationArr.region, locationArr.country))
				location = locationArr.city
			} catch(err) {
				console.log(err)
				location = "unknown"
			}
			
			
			usersArr.push({
				'Name':users[i].name, 
				'Score':users[i].statistics.score,
				'Account_creation_date':users[i].statistics.misc.account_creation_date[0],
				'Location':location
			})
		}

		usersArr.sort()
		console.log(usersArr)
		res.send(usersArr)
	})
})

app.get('/api/get/posts/:postid', async(req,res) => {
	// Commenting out this part below allows for users to view without being logged in
	try {
		token = req.cookies.token
		////console.logtoken)
		const verified = jwt.verify(token, process.env.JWT_SECRET)
		userID = verified.id
		
	} catch (err) {
		////console.logerr)
		if (!allowUsersToBrowseAsGuests) {
			return res.json({ status:"ok", code:400, error: "Not logged in"})
		} else {
			userID = null
		}
	}
	

	postModified = []
	Post.findById(req.params.postid, function (err, post) {
		if (post == null) {
			res.send({error:'No post found'})
		} else {
			if (post.posterID == userID) {
				postModified = post
				postModified.current_user_admin = true
			} else {
				postModified = post
				postModified.current_user_admin = false
			}
			if (post.users_upvoted.includes(userID)) {
				postModified.current_user_upvoted = true
				postModified.current_user_downvoted = false
			}
			if (post.users_downvoted.includes(userID)) {
				postModified.current_user_upvoted = false
				postModified.current_user_downvoted = true
			}
			for (i=0;i<post.comments.length;i++) {
				com = post.comments[i]
				if (com.users_voted.includes(userID)) {
					postModified.comments[i].current_user_voted = true
				}
			}
			try {
				User.findById(userID, function(err, docs) {
					if (docs != null) {
						let datetime = new Date()
						month = datetime.getUTCMonth()+1
						day = datetime.getUTCDate()
						year = datetime.getUTCFullYear()
						hour = datetime.getUTCHours()
						minute = datetime.getUTCMinutes()
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
		
						fulldatetime = month+"/"+day+"/"+year+" at "+hour+":"+minute+" "+ampm+" UTC"
		
						viewed_num = docs.statistics.posts.viewed_num
						viewed_array = docs.statistics.posts.viewed_array
						viewed_array.push([post.title, post.topic, post.id, fulldatetime ])
						docs.statistics.posts.viewed_num = (viewed_num+1)
						docs.statistics.posts.viewed_array = viewed_array
						docs.save()	
					}
					
				})
			} catch (err) {
				console.log(err)
			}
			
	
			//console.logpostModified)
			res.send(post)
		}
		
	})
})



app.get('/api/get/:topic/:page', async(req, res) => {	
	postsonpage = []
	// Commenting out this part below allows for users to view without being logged in
	try {
		token = req.cookies.token
		//console.logtoken)
		const verified = jwt.verify(token, process.env.JWT_SECRET)
		userID = verified.id
	} catch (err) {
		//console.logerr)
		if (!allowUsersToBrowseAsGuests) {
			return res.json({ status:"ok", code:400, error: "Not logged in"})
		} else {
			userID = null
		}
	}
	
	if (req.params.topic == "all") {
		Post.find({}).sort({total_votes: -1}).exec(function(err, posts){
			if(err){
			  ////console.logerr);
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
			} else{
				try {
					User.findById(userID, function(err, docs) {
						if (docs.statistics.topics.visited_array.some(x => x[0] == req.params.topic)) {
							index = docs.statistics.topics.visited_array.findIndex(x => x[0] == req.params.topic)
							currentCount = docs.statistics.topics.visited_array[index][2]
							docs.statistics.topics.visited_array[index] = [req.params.topic, Date.now(),(currentCount+1)]
	
						} else {
							docs.statistics.topics.visited_array.push([req.params.topic, Date.now(), 1])
							docs.statistics.topics.visited_num += 1
						}
						
						docs.save()
					})
				} catch(err) {
					console.log(err)
				}
				
				
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

app.get('/api/get/posts/user/:user', async(req, res) => {	
	postsonpage = []
	// Commenting out this part below allows for users to view without being logged in
	try {
		token = req.cookies.token
		//console.logtoken)
		const verified = jwt.verify(token, process.env.JWT_SECRET)
		userID = verified.id
	} catch (err) {
		//console.logerr)
		if (!allowUsersToBrowseAsGuests) {
			return res.json({ status:"ok", code:400, error: "Not logged in"})
		} else {
			userID = null
		}
	}
	
	Post.find({poster:req.params.user}).sort({total_votes: -1}).exec(function(err, posts){
		if(err){
		} else{
			try {
				User.findById(userID, function(err, docs) {
					if (docs.statistics.topics.visited_array.some(x => x[0] == req.params.topic)) {
						index = docs.statistics.topics.visited_array.findIndex(x => x[0] == req.params.topic)
						currentCount = docs.statistics.topics.visited_array[index][2]
						docs.statistics.topics.visited_array[index] = [req.params.topic, Date.now(),(currentCount+1)]

					} else {
						docs.statistics.topics.visited_array.push([req.params.topic, Date.now(), 1])
						docs.statistics.topics.visited_num += 1
					}
					
					docs.save()
				})
			} catch(err) {
				console.log(err)
			}
			
			
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
})

app.get('/api/get/users', async(req, res) => {	
	User.find({}, function(err, users) {
		usersArr = []
		for (i=0;i<users.length;i++) {
			usersArr.push({
				'name':users[i].name, 
				'color':users[i].color
			})
		}
		res.send(usersArr)
	})
})

app.get('/api/get/topics', async(req, res) => {	
	topicArray = []
	topicCount = []
	Post.find({}, function(err, posts){
        if(err){
          ////console.logerr);
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
			////console.logjoinedArray)
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
		let datetime = new Date()
		month = datetime.getUTCMonth()+1
		day = datetime.getUTCDate()
		year = datetime.getUTCFullYear()
		hour = datetime.getUTCHours()
		minute = datetime.getUTCMinutes()
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

		fulldatetime = month+"/"+day+"/"+year+" at "+hour+":"+minute+" "+ampm+" UTC"

		User.findById(user._id, function(err, docs) {
			console.log("user:"+docs)
			docs.statistics.misc.login_num += 1
			docs.statistics.misc.login_array.push([fulldatetime, Date.now()])
			docs.save()
		})

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

	color = '#'+(0x1000000+Math.random()*0xffffff).toString(16).substr(1,6)
	var rgb = [Math.random() * 256, Math.random() * 256, Math.random() * 256];
	var mix = [brightness*51, brightness*51, brightness*51]; //51 => 255/5
	var mixedrgb = [rgb[0] + mix[0], rgb[1] + mix[1], rgb[2] + mix[2]].map(function(x){ return Math.round(x/2.0)})
	usercolor = "rgb(" + mixedrgb.join(",") + ")";

    try {
		const response = await User.create({
            name: name,
            password: password,
			color: usercolor
		})
		////console.log'User created successfully: ', response)
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
		////console.logverified)
		userID = verified.id
		poster = verified.name
	} catch (err) {
		return res.json({ status:"error", code:400, error: err})
	}

	let datetime = new Date()
	month = datetime.getUTCMonth()+1
	day = datetime.getUTCDate()
	year = datetime.getUTCFullYear()
	hour = datetime.getUTCHours()
	minute = datetime.getUTCMinutes()
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

	fulldatetime = month+"/"+day+"/"+year+" at "+hour+":"+minute+" "+ampm+" UTC"

	try {
		const response = await Post.create({
            title: title, 
			body: body, 
			poster: poster,
			link: link,
			topic: topic,
			type: type, // 1=text, using as temporary default
			posterID: userID,
			date: fulldatetime,
			timestamp:timestamp
		})
		console.log(response)
		User.findById(userID, function(err, docs) {
			docs.statistics.posts.created_num += 1
			docs.statistics.posts.created_array.push([title, topic, response.id, fulldatetime])
			docs.save()
		})
		res.json({ status:"ok", code:200, data: response})
	} catch (error) {
		console.log("ERROR:"+error)
		res.json(error)
	}
})


app.post('/api/post/comment/', async(req, res) => {
	const {body:reqbody, id} = req.body
	try {
		token = req.cookies.token
		const verified = jwt.verify(token, process.env.JWT_SECRET)
		userID = verified.id
		username = verified.name
	} catch (err) {
		return res.json({ status:"error", code:400, error: err})
	}

	let datetime = new Date()
	month = datetime.getUTCMonth()+1
	day = datetime.getUTCDate()
	year = datetime.getUTCFullYear()
	hour = datetime.getUTCHours()
	minute = datetime.getUTCMinutes()
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

	fulldatetime = month+"/"+day+"/"+year+" at "+hour+":"+minute+" "+ampm+" UTC"
	try {
		Post.findById(id, function(err, docs) {
			//console.logdocs)
			commentArray = docs.comments
			commentid = Math.floor(Math.random() * Date.now()) // generates a random id
			newComment = {
				'body': reqbody,
				'poster':username,
				'posterID': userID,
				'date': fulldatetime,
				'timestamp':timestamp,
				'total_votes':0,
				'users_voted':[],
				'nested_comments':[],
				'_id': commentid
			}
			commentArray.push(newComment)
			docs.comments = commentArray
			docs.save()
			User.findById(userID, function(err, docs) {
				docs.statistics.comments.created_num += 1
				docs.statistics.comments.created_array.push([reqbody, id, commentid])
				docs.save()
			})
			User.findById(userID, function(err, docs) {
				//console.logdocs)
			})
			res.json(newComment)
		})
	} catch(err) {
		res.send(err)
	}
	
})

app.post('/api/post/comment_nested/', async(req, res) => {
	const {body:reqbody, id, parentID} = req.body

	try {
		token = req.cookies.token
		const verified = jwt.verify(token, process.env.JWT_SECRET)
		userID = verified.id
		username = verified.name
	} catch (err) {
		return res.json({ status:"error", code:400, error: err})
	}

	let datetime = new Date()
	month = datetime.getUTCMonth()+1
	day = datetime.getUTCDate()
	year = datetime.getUTCFullYear()
	hour = datetime.getUTCHours()
	minute = datetime.getUTCMinutes()
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

	fulldatetime = month+"/"+day+"/"+year+" at "+hour+":"+minute+" "+ampm+" UTC"
	try {
		Post.findById(id, function(err, docs) {
			// docs.statistics.topics.visited_array.some(x => x[0] == req.params.topic)
			parentCommentIndex = docs.comments.findIndex(x => x._id == parentID)
			console.log("index:"+parentCommentIndex)

			oldComment = docs.comments[parentCommentIndex]
			newComment = {
				body:reqbody,
				poster:username,
				posterid:userID,
				date:fulldatetime,
				score:0
			}
			oldComment.nested_comments.push(newComment)

			docs.comments[parentCommentIndex] = oldComment
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
		////console.log"verified:"+JSON.stringify(verified))
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
		userID = verified.id
	} catch (err) {
		return res.json({ status:"error", code:400, error: err})
	}

	try {
		Post.findOne({_id: id }, function (err, docs) { 
			upvotes = docs.upvotes
			downvotes = docs.downvotes
			total_votes = docs.total_votes
			users_upvoted = docs.users_upvoted
			users_downvoted = docs.users_downvoted

			user_already_upvoted = users_upvoted.includes(userID)
			user_already_downvoted = users_downvoted.includes(userID)
			posterid = docs.posterID


			if (change == 1) {
				if (user_already_upvoted) {
					// do nothing
				}
				if (user_already_downvoted) {
					// remove the downvote, total_votes+1
					Post.findOneAndUpdate({ _id: id }, { $set: {downvotes: (downvotes-1), total_votes: (total_votes+1)},  $pull: {users_downvoted: userID} }, {}, function (err, numReplaced) {
						User.findById(posterid, function(err, docs) {
							docs.statistics.score += 1
							docs.save()
						})
						return res.json({"status":'ok', 'newtotal':total_votes+1, 'gif':'none'})
					})
				}
				if (!user_already_downvoted && !user_already_upvoted) {
					// vote up
					Post.findOneAndUpdate({ _id: id }, { $set: {upvotes: (upvotes+1), total_votes: (total_votes+1)},  $push: {users_upvoted: userID} }, {}, function (err, numReplaced) {
						User.findById(posterid, function(err, docs) {
							docs.statistics.score += 1
							docs.save()
						})
						return res.json({"status":'ok', 'newtotal':total_votes+1, 'gif':'up'})
					})
				}
			}

			if (change == -1) {
				if (user_already_downvoted) {
					// do nothing
				}
				if (user_already_upvoted) {
					// remove the upvote, total_votes-1
					Post.findOneAndUpdate({ _id: id }, { $set: {upvotes: (upvotes-1), total_votes: (total_votes-1)},  $pull: {users_upvoted: userID} }, {}, function (err, numReplaced) {
						User.findById(posterid, function(err, docs) {
							docs.statistics.score -= 1
							docs.save()
						})
						return res.json({"status":'ok', 'newtotal':total_votes-1, 'gif':'none'})
					})
				}
				if (!user_already_downvoted && !user_already_upvoted) {
					// vote down
					Post.findOneAndUpdate({ _id: id }, { $set: {downvotes: (downvotes+1), total_votes: (total_votes-1)},  $push: {users_downvoted: userID} }, {}, function (err, numReplaced) {
						User.findById(posterid, function(err, docs) {
							docs.statistics.score -= 1
							docs.save()
						})
						return res.json({"status":'ok', 'newtotal':total_votes-1, 'gif':'down'})
					})
				}
			}
		
		})

	} catch(err) {
		res.json({'status':'error'})
	}
})

app.put('/voteComment/:parentid/:commentid', function(req,res) {
	pID = req.params.parentid
	id = req.params.commentid
	//console.log"id:"+id)
	try {
		token = req.cookies.token
		const verified = jwt.verify(token, process.env.JWT_SECRET)
		userID = verified.id
		//console.loguserID)
	} catch (err) {
		return res.json({ status:"error", code:400, error: err})
	}

	try {
		Post.findById(pID, function(err, docs) {
			oldComArray = docs.comments

			for (i=0;i<oldComArray.length;i++) {
				if (oldComArray[i]._id == id) {
					//console.log"match:"+i)
					index = i
				}
			}
			oldVotes = oldComArray[index].total_votes
			newVotes = oldVotes+1
			newVotesDown = oldVotes-1
			commentPosterID = oldComArray[index].posterID
			
			
			if (oldComArray[index].users_voted.includes(userID)) {
				userIDinArray = oldComArray[index].users_voted.indexOf(userID)
				oldComArray[index].users_voted.splice(userIDinArray, 1)
				oldComArray[index].total_votes = newVotesDown
				Post.findByIdAndUpdate(pID, {comments: oldComArray}, function(err, docs) {	
					User.findById(commentPosterID, function(err, docs) {
						docs.statistics.score -= 1
						docs.save()
					})
					docs.save()
					res.json({"status":'ok', "newcount":oldComArray[index].total_votes, 'voted':'no'})
				})
				
			} else {
				oldComArray[index].users_voted.push(userID)
				oldComArray[index].total_votes = newVotes
				Post.findByIdAndUpdate(pID, {comments: oldComArray}, function(err, docs) {	
					User.findById(commentPosterID, function(err, docs) {
						docs.statistics.score += 1
						docs.save()
					})
					docs.save()
					res.json({"status":'ok', 'newcount':oldComArray[index].total_votes, 'voted':'yes'})
				})
			}
		})
		
	} catch (err) {

	}

})

function updateSchema() {
	userID_array = []
	user_array = []
	User.find({}, function(err, docs) {
		for (i=0;i<docs.length;i++) {
			userID_array.push(docs[i].id)
			user_array.push(docs[i])
			docs[i].save()
		}
	})
}

updateSchema()

app.listen(process.env.PORT || 3000)