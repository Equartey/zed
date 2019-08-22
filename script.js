/*
* PROJECT Zed
*
* Cause everyone makes a zombie game.
*/

/*
 * Check List
 *
 * [ ] Render Functions
 * [ ] Camera/View Ports
 * [ ] Draw Player/Zeds
 * [ ] Add Controls to Player
 * [ ] Add AI to Zeds
 * [ ] Collidable Objects
 * [ ] Projectiles
 * [ ] Guns/Store/PowerUps
 *
 */
    /* 
        Updated answer in response to Honey Badger at "http://stackoverflow.com/a/16926273/2252829"
        Using requestAnimationFrame instead of setInterval:
        The most noted differences are the addition of requestAnimationFrame polyfill and the call of requestAnimationFrame at gameLoop function.
        The differences between codes will be recognized by "<--" flag in comments
    */

    // requestAnimationFrame polyfill
    // http://paulirish.com/2011/requestanimationframe-for-smart-animating/
	var zedCollide = false;
	
    (function(){	
		var lastTime = 0;
		var currTime, timeToCall, id;
		var vendors = ['ms', 'moz', 'webkit', 'o'];		
		for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
			window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
			window.cancelAnimationFrame = 
			  window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
		}	 
		if (!window.requestAnimationFrame)
		{
			window.requestAnimationFrame = function(callback, element) {
				currTime = Date.now();
				timeToCall = Math.max(0, 16 - (currTime - lastTime));
				id = window.setTimeout(function() { callback(currTime + timeToCall); }, 
				  timeToCall);
				lastTime = currTime + timeToCall;
				return id;
			};
		}	 
		if (!window.cancelAnimationFrame)
		{
			window.cancelAnimationFrame = function(id) {
				clearTimeout(id);
			};
		}	
	})(); // <-- added

    // wrapper for our game "classes", "methods" and "objects"
	window.Game = {};
	
	// wrapper for "class" Rectangle
	(function(){
		function Rectangle(left, top, width, height){
			this.left = left || 0;
			this.top = top || 0;
            this.width = width || 0;
			this.height = height || 0;
			this.right = this.left + this.width;
			this.bottom = this.top + this.height;
		}
		
		Rectangle.prototype.set = function(left, top, /*optional*/width, /*optional*/height){
			this.left = left;
            this.top = top;
            this.width = width || this.width;
            this.height = height || this.height
            this.right = (this.left + this.width);
            this.bottom = (this.top + this.height);
		}
		
		Rectangle.prototype.within = function(r) {
			return (r.left <= this.left && 
					r.right >= this.right &&
					r.top <= this.top && 
					r.bottom >= this.bottom);
		}		
		
		Rectangle.prototype.overlaps = function(r) {
			return (this.left < r.right && 
					r.left < this.right && 
					this.top < r.bottom &&
					r.top < this.bottom);
		}

		// add "class" Rectangle to our Game object
		Game.Rectangle = Rectangle;
	})();	

	// wrapper for "class" Camera (avoid global objects)
	(function(){
	
		// possibles axis to move the camera
		var AXIS = {
			NONE: "none", 
			HORIZONTAL: "horizontal", 
			VERTICAL: "vertical", 
			BOTH: "both"
		};

		// Camera constructor
		function Camera(xView, yView, canvasWidth, canvasHeight, worldWidth, worldHeight)
		{
			// position of camera (left-top coordinate)
			this.xView = xView || 0;
			this.yView = yView || 0;
			
			// distance from followed object to border before camera starts move
			this.xDeadZone = 0; // min distance to horizontal borders
			this.yDeadZone = 0; // min distance to vertical borders
			
			// viewport dimensions
			this.wView = canvasWidth;
			this.hView = canvasHeight;			
			
			// allow camera to move in vertical and horizontal axis
			this.axis = AXIS.BOTH;	
		
			// object that should be followed
			this.followed = null;
			
			// rectangle that represents the viewport
			this.viewportRect = new Game.Rectangle(this.xView, this.yView, this.wView, this.hView);				
								
			// rectangle that represents the world's boundary (room's boundary)
			this.worldRect = new Game.Rectangle(0, 0, worldWidth, worldHeight);			
		}

		// gameObject needs to have "x" and "y" properties (as world(or room) position)
		Camera.prototype.follow = function(gameObject, xDeadZone, yDeadZone)
		{		
			this.followed = gameObject;	
			this.xDeadZone = xDeadZone;
			this.yDeadZone = yDeadZone;
		}					
		
		Camera.prototype.update = function()
		{
			// keep following the player (or other desired object)
			if(this.followed != null)
			{		
				if(this.axis == AXIS.HORIZONTAL || this.axis == AXIS.BOTH)
				{		
					// moves camera on horizontal axis based on followed object position
					if(this.followed.x - this.xView  + this.xDeadZone > this.wView)
						this.xView = this.followed.x - (this.wView - this.xDeadZone);
					else if(this.followed.x  - this.xDeadZone < this.xView)
						this.xView = this.followed.x  - this.xDeadZone;
					
				}
				if(this.axis == AXIS.VERTICAL || this.axis == AXIS.BOTH)
				{
					// moves camera on vertical axis based on followed object position
					if(this.followed.y - this.yView + this.yDeadZone > this.hView)
						this.yView = this.followed.y - (this.hView - this.yDeadZone);
					else if(this.followed.y - this.yDeadZone < this.yView)
						this.yView = this.followed.y - this.yDeadZone;
				}						
				
			}		
			
			// update viewportRect
			this.viewportRect.set(this.xView, this.yView);
			
			// don't let camera leaves the world's boundary
			if(!this.viewportRect.within(this.worldRect))
			{
				if(this.viewportRect.left < this.worldRect.left)
					this.xView = this.worldRect.left;
				if(this.viewportRect.top < this.worldRect.top)					
					this.yView = this.worldRect.top;
				if(this.viewportRect.right > this.worldRect.right)
					this.xView = this.worldRect.right - this.wView;
				if(this.viewportRect.bottom > this.worldRect.bottom)					
					this.yView = this.worldRect.bottom - this.hView;
			}
			
		}	
		
		// add "class" Camera to our Game object
		Game.Camera = Camera;
		
	})();
	
	// wrapper for "class" Player
	(function(){
		function Player(x, y){
			// (x, y) = center of object
			// ATTENTION:
			// it represents the player position on the world(room), not the canvas position
			this.x = x;
			this.y = y;				
			// move speed in pixels per second
			this.speed = 250;		
			
			// render properties
			this.width = 50;
			this.height = 50;
			this.radius = 30;
			this.collide = true
			
			//player characteristics
			this.health = 100;
			this.armor = 100;
		}
		//Define variables for use by other functions
		Player.prototype.x = function(){
            return this.x;
        }
        Player.prototype.y = function(){
            return this.y;
        }
        Player.prototype.r = function(){
            return this.radius;
        } 
		Player.prototype.health = function(){
            return this.health;
        }
		Player.prototype.armor = function(){
            return this.armor;
        }
		
		Player.prototype.rgbToHex = function(r, g, b) {
				if (r > 255 || g > 255 || b > 255){
					throw "Invalid color component";
				}else{
					return ((r << 16) | (g << 8) | b).toString(16);
				}
		}
		
		Player.prototype.update = function(step, worldWidth, worldHeight, zX, zY, zR, tileArr){
			// parameter step is the time between frames ( in seconds )
			// check controls and move the player accordingly
			if(Game.controls.left)
				this.x -= this.speed * step;
			if(Game.controls.up)
				this.y -= this.speed * step;
			if(Game.controls.right)
				this.x += this.speed * step;
			if(Game.controls.down)
				this.y += this.speed * step;		
			
			//don't let player leave the world's boundary
			if(this.x - this.width/2 < 0){
				this.x = this.width/2;
			}
			if(this.y - this.height/2 < 0){
				this.y = this.height/2;
			}
			if(this.x + this.width/2 > worldWidth){
				this.x = worldWidth - this.width/2;
			}
			if(this.y + this.height/2 > worldHeight){
				this.y = worldHeight - this.height/2;
			}
			
			function clamp(val, min, max) {
				return Math.max(min, Math.min(max, val))
			}
			
			function RectCircleColliding(tx, ty, ts, x, y, r) {
				
				// Find the closest point to the circle within the rectangle
				// Assumes axis alignment! ie rect must not be rotated
				var closestX = clamp(x, tx, tx + ts);
				var closestY = clamp(y, ty, ty + ts);

				// Calculate the distance between the circle's center and this closest point
				var distanceX = x - closestX;
				var distanceY = y - closestY;

				// If the distance is less than the circle's radius, an intersection occurs
				var distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);
				if (distanceSquared < (r * r)){
					return(true);
				}
			}
			//Collisions with tiles
			for (var i = 0; i < tileArr.length; i++) {
				var tmp = tileArr[i];
				var tmpX = tileArr[i].x;
				var tmpY = tileArr[i].y;
				var tmpC = tileArr[i].c;
				var tmpS = tileArr[i].s;
				//console.log(tmpX, tmpY);
				//console.log(this.x, this.y);
				//console.log(tile.x, tile.y);
				if(RectCircleColliding(tmpX, tmpY, tmpS, this.x, this.y, this.radius)){
					console.log("boop");
				}
				
				/* var dx=Math.abs(this.x-(tmpX+tmpS/2));
				var dy=Math.abs(this.y-(tmpX+tmpS/2));

				if( dx > this.radius+tmpS ){ return(false); }
				if( dy > this.radius+tmpS ){ return(false); }

				if( dx <= tmpS ){ return(true); }
				if( dy <= tmpS ){ return(true); }

				var dx=dx-tmpS;
				var dy=dy-tmpS;
				return(dx*dx+dy*dy<=this.radius*this.radius); */
				
				/* function clamp(val, min, max) {
					return Math.max(min, Math.min(max, val))
				}

				// Find the closest point to the circle within the rectangle
				// Assumes axis alignment! ie rect must not be rotated
				var closestX = clamp(this.x, tmpX, tmpX + tmpS);
				var closestY = clamp(this.y, tmpY, tmpY + tmpS);

				// Calculate the distance between the circle's center and this closest point
				var distanceX = this.x - closestX;
				var distanceY = this.y - closestY;

				// If the distance is less than the circle's radius, an intersection occurs
				var distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);
				if (distanceSquared < (this.radius * this.radius)){
					console.log("collided");
				} */
			}
			//Collisions with Zombies
			zedX = zX;
			zedY = zY;
			zedR = zR;
			if (zedX + zedR + this.radius > this.x && zedX < this.x + zedR + this.radius && zedY + zedR + this.radius > this.y && zedY < this.y + zedR + this.radius) {
				distance = Math.sqrt(((zedX - this.x) * (zedX - this.x)) + ((zedY - this.y) * (zedY - this.y)));
				if (distance < zedR + this.radius){
					collisionPointX = ((zedX) + (this.x * zedR)) / (zedR + this.radius);
					collisionPointY = ((zedY * zedR) + (this.y * zedR)) / (zedR + this.radius);
					zedCollide = true;
					if (this.armor > 0){
						this.armor -= 20;
					} else if (this.health > 0){
						this.health -= 10;
					} else {
						console.log("GAME OVER MAN")
					}
					return;
				}
			}
		}
		
		Player.prototype.draw = function(context, xView, yView){	
			/*//Load and render Sprites
			 function sprite (options) {
				var that = {};
				frameIndex = 1,
				tickCount = 0,
				ticksPerFrame = 4;
				numberOfFrames = options.numberOfFrames || 3;
				
				that.context = options.context;
				that.width = options.width;
				that.height = options.height;
				that.image = options.image;
				that.loop = options.loop;
				
				//Render Sprite
				that.render = function () {
					// Draw the animation
					console.log("X: ", this.x, "Y: ", this.y);
					that.context.drawImage(
					   that.image,
					   frameIndex * that.width / numberOfFrames,
					   0,
					   that.width / numberOfFrames,
					   that.height,
					   32, 
					   32,
					   that.width / numberOfFrames,
					   that.height);
				};
				//Update Sprite
				that.update = function () {
					tickCount += 1;
					if (tickCount > ticksPerFrame) {
						tickCount = 0;
						console.log("Pre-Update hit!");
						// If the current frame index is in range
						if (frameIndex < numberOfFrames - 1) {
							// Go to the next frame
							console.log("Update hit!");
							frameIndex += 1; 
						} else if (that.loop) {
							frameIndex = 0;
						}
					}
				}; 

				return that;
			}
			//Create Player Sprite
			var solider = new Image();
			solider.src = "image/basicSolider.png";
			var playerSprite = sprite({
				context: context,
				width: 32,
				height: 32,
				image: solider
			}); */
			// draw a simple rectangle shape as our player model
			context.save();		
			// before draw we need to convert player world's position to canvas position			
			//context.fillRect((this.x-this.width/2) - xView, (this.y-this.height/2) - yView, this.width, this.height);
			
			//Temp Fix for player
			context.beginPath();
			context.arc((this.x-this.width/2) - xView, (this.y-this.height/2) - yView, this.radius, 0, 2 * Math.PI, false);
			context.fillStyle = '#19BDFF';
			context.fill();
			context.lineWidth = 3;
			context.strokeStyle = '#00668F';
			context.stroke();
			
			//context.drawImage(solider, 0, 0, 32, 32, (this.x-this.width/2) - xView, (this.y-this.height/2) - yView, 0, 0);
			//playerSprite.update();
			//playerSprite.render();
			context.restore();			
		}
		
		// add "class" Player to our Game object
		Game.Player = Player;
	})();
	
	(function(){
		function Zed(x, y){
			// (x, y) = center of object
			// ATTENTION:
			// it represents the Zed position on the world(room), not the canvas position
			this.x = x;
			this.y = y;					
			//Status
			this.health = 100;
			this.alive = true;
			// render properties
			this.width = 50;
			this.height = 50;
			this.radius = 30;
		}
		
		//Define variables for use by other functions
		Zed.prototype.x = function(){
            return this.x;
        }
        Zed.prototype.y = function(){
            return this.y;
        }
		Zed.prototype.r = function(){
            return this.radius;
        }
		
		Zed.prototype.update = function(step, worldWidth, worldHeight, pX, pY){
			// parameter step is the time between frames ( in seconds )
			// check controls and move the Zed accordingly
			//Gets Player Position
			playerX = pX;
			playerY = pY;
			if(this.alive){
				trackY = 1.5*(playerY - this.y);
				trackX = 1.5*(playerX - this.x);
				this.y += trackY * step;
				this.x += trackX * step;
				if (zedCollide){
				this.x -= trackX;
				this.y -= trackY;
				zedCollide = false;
				}
			} 
			// don't let Zed leave the world's boundary
			if(this.x - this.width/2 < 0){
				this.x = this.width/2;
			}
			if(this.y - this.height/2 < 0){
				this.y = this.height/2;
			}
			if(this.x + this.width/2 > worldWidth){
				this.x = worldWidth - this.width/2;
			}
			if(this.y + this.height/2 > worldHeight){
				this.y = worldHeight - this.height/2;
			}
			
		}
		
		Zed.prototype.draw = function(context, xView, yView){	
			// draw a simple rectangle shape as our Zed model
			context.save();		
			// before draw we need to convert Zed world's position to canvas position			
			//context.fillRect((this.x-this.width/2) - xView, (this.y-this.height/2) - yView, this.width, this.height);
			
			//Temp Fix for Enemies
			context.beginPath();
			context.arc((this.x-this.width/2) - xView, (this.y-this.height/2) - yView, this.radius, 0, 2 * Math.PI, false);
			context.fillStyle = '#32cd32';
			context.fill();
			context.lineWidth = 3;
			context.strokeStyle = '#28a428';
			context.stroke();
			
			context.restore();			
		}
		
		// add "class" Zed to our Game object
		Game.Zed = Zed;
		
	})();

	// wrapper for "class" Map
	(function(){
		function Map(width, height){
			// map dimensions
			this.width = width;
			this.height = height;
			
			// map texture
			this.image = null;
			
			//tile pramas
			var tileArray = [];
			var tile = {};
			this.tileArray = tileArray;
			this.tile = tile;
		}
		
		// generate an example of a large map
		Map.prototype.generate = function(){
			var ctx = document.createElement("canvas").getContext("2d");		
			ctx.canvas.width = this.width;
			ctx.canvas.height = this.height;
			
			var rows = ~~(this.width/42) + 1;
			var columns = ~~(this.height/42) + 1;
			
			var tileSize = 40;

			
		
			var mapArray = [
				[0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0],
				[0, 0, 0, 0, 0, 5, 5, 5, 5, 1, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0],
				[0, 0, 0, 0, 5, 4, 4, 4, 4, 5, 1, 1, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0],
				[0, 0, 0, 5, 4, 4, 4, 4, 4, 4, 5, 1, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0],
				[0, 0, 0, 5, 4, 4, 4, 4, 4, 4, 4, 1, 1, 1, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 1, 1, 1, 1, 1, 1, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0],
				[0, 0, 0, 5, 4, 4, 4, 4, 4, 4, 4, 1, 1, 1, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 1, 1, 1, 1, 1, 1, 1, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0],
				[0, 0, 0, 5, 4, 4, 4, 4, 4, 4, 5, 1, 1, 1, 1, 1, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 1, 1 ,1, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,1, 1, 1, 1, 1, 1, 1, 1, 1, 1 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0],
				[0, 0, 0, 0, 5, 4, 4, 4, 4, 5, 1, 1, 1, 1, 1, 1, 1 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 1, 1 ,1, 1, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 1 ,1, 1, 1, 1, 1, 1, 1, 1, 1, 1 ,1, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0],
				[0, 0, 0, 0, 0, 5, 4, 4, 5, 1, 1, 1, 1, 1, 1, 1, 1 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 1, 1 ,1, 1, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 1 ,1, 1, 1, 1, 1, 1, 1, 1, 1, 1 ,1, 1, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0],
				[0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 1 ,1, 1, 1, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 1 ,1, 1, 1, 1, 1, 1, 1, 1, 1, 1 ,1, 1, 1, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0],
				[0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,1, 1, 1, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 1 ,1, 1, 1, 1, 1, 1, 1, 1, 1, 1 ,1, 1, 1, 1, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0],
				[0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1 ,1, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,1, 1, 1, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 1 ,1, 1, 1, 1, 1, 1, 1, 1, 1, 1 ,1, 1, 1, 1, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1 ,1, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 1, 1, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 1, 1, 1, 1, 1, 1, 1, 1, 1 ,1, 1, 1, 1, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1 ,1, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 1, 1, 1, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 1, 1, 1, 1, 1, 1, 1 ,1, 1, 1, 1, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1 ,1, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,1, 1, 1, 1, 1 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 1, 1, 1, 1, 1 ,1, 1, 1, 1, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,1, 1, 1, 1, 1 ,1, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 1, 1, 1, 1 ,1, 1, 1, 1, 0 ,0, 0, 0, 0, 0 ,0, 0, 5, 4, 4 ,4, 4, 5],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,1, 1, 1, 1, 1 ,1, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 1, 1, 1 ,1, 1, 1, 1, 0 ,0, 0, 0, 0, 0 ,0, 0, 5, 4, 4 ,4, 4, 5],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 1, 1, 1, 1 ,1, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 1, 1 ,1, 1, 1, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 5, 4, 4 ,4, 4, 5],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 1, 1, 1 ,1, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 1, 1 ,1, 1, 0, 5, 5 ,5, 5, 5, 5, 5 ,5, 5, 5, 4, 4 ,4, 4, 5],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 5, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 5],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 5, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 5],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 5, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 5],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 5, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 5],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 5, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 5],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 1, 1, 1, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 5, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 5],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 1 ,1, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,1, 1, 1, 1, 1, 0, 1, 1, 1, 0 ,0, 0, 0, 5, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 5],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 1, 1 ,1, 1, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 1, 1 ,1, 1, 1, 1, 1, 0, 1, 0, 1, 0 ,0, 0, 0, 5, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 5],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 1, 1, 1 ,1, 1, 1, 0, 0 ,0, 0, 0, 0, 0, 0, 1, 1, 1, 1 ,1, 1, 1, 1, 1, 1, 0, 0, 0, 0 ,0, 0, 0, 5, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 5],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 1, 1, 1 ,1, 1, 1, 0, 0 ,0, 0, 0, 0, 0, 1, 1, 1, 1, 1 ,1, 1, 1, 1, 1, 1, 0, 1, 0, 0 ,0, 0, 0, 5, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 5],
				[0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 1, 1 ,1, 1, 0, 0, 0 ,0, 0, 0, 0, 0, 1, 1, 1, 1, 1 ,1, 1, 1, 1, 1, 0, 0, 1, 0, 0 ,0, 0, 0, 5, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 5],
				[0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 1 ,1, 1, 0, 0, 0 ,0, 0, 0, 0, 0, 1, 1, 1, 1, 1 ,1, 1, 1, 1, 1, 1, 0, 1, 0, 0 ,0, 0, 0, 5, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 5],
				[0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 1, 1, 1, 1, 1 ,1, 1, 1, 1, 1, 1, 1, 0, 0, 0 ,0, 0, 0, 5, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 5],
				[0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 1, 1, 1, 1, 1 ,1, 1, 1, 1, 1, 0, 0, 0, 0, 0 ,0, 0, 0, 5, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 5],
				[0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 1, 1, 1, 1 ,1, 1, 1, 1, 1, 0, 0, 0, 0, 0 ,0, 0, 0, 5, 4 ,4, 4, 4, 4, 4 ,4, 5, 5, 5, 5 ,5, 5, 5],
				[0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 1, 1 ,1, 1, 1, 1, 1, 0, 0, 0, 0, 0 ,0, 0, 0, 5, 4 ,4, 4, 4, 4, 4 ,4, 5, 0, 0, 0 ,0, 0, 0],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 1 ,1, 1, 1, 1, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 5, 4 ,4, 4, 4, 4, 4 ,4, 5, 0, 0, 0 ,0, 0, 0],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0 ,0, 0, 0, 1, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 5, 4 ,4, 4, 4, 4, 4 ,4, 5, 0, 0, 0 ,0, 0, 0],
				[0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0 ,0, 0, 1, 1, 1 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 5, 4 ,4, 4, 4, 4, 4 ,4, 5, 0, 0, 0 ,0, 0, 0],
				[0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0 ,0, 0, 1, 1, 1 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 5, 4 ,4, 4, 4, 4, 4 ,4, 5, 0, 0, 0 ,0, 0, 0],
				[0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0 ,0, 1, 1, 1, 1 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 5, 4 ,4, 4, 4, 4, 4 ,4, 5, 0, 0, 0 ,0, 0, 0],
				[0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0 ,0, 1, 1, 1, 1 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 5, 4 ,4, 4, 4, 4, 4 ,4, 5, 0, 0, 0 ,0, 0, 0],
				[0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0 ,0, 1, 1, 1, 1 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 1 ,1, 1, 1, 1, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 5, 4 ,4, 4, 4, 4, 4 ,4, 5, 0, 0, 0 ,0, 0, 0],
				[0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0 ,0, 1, 1, 1, 1 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 1, 1 ,1, 1, 1, 1, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 5, 4 ,4, 4, 4, 4, 4 ,4, 5, 0, 0, 0 ,0, 0, 0],
				[0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0 ,0, 1, 1, 1, 1 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 1, 1, 1 ,1, 1, 1, 1, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 5, 4 ,4, 4, 4, 4, 4 ,4, 5, 0, 0, 0 ,0, 0, 0],
				[0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0 ,0, 1, 1, 1, 1 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 1, 1, 1 ,1, 1, 1, 1, 1, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 5, 4 ,4, 4, 4, 4, 4 ,4, 5, 0, 0, 0 ,0, 0, 0],
				[0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0 ,0, 1, 1, 1, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 1, 1, 1 ,1, 1, 1, 1, 1, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 5, 5, 5, 5, 5 ,5, 5, 5, 5, 4 ,4, 4, 4, 4, 4 ,4, 5, 5, 5, 5 ,5, 5, 5],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 1, 1, 1, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 1, 1, 1, 1 ,1, 1, 1, 1, 1, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 5, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 5],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 1, 1, 1, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 1, 1, 1, 1 ,1, 1, 1, 1, 1, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 5, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 5],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 1, 1, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 1, 1, 1 ,1, 1, 1, 1, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 5, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 5],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 5, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 5],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 5, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 5],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 5, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 5],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 5, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 5],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 5, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 5],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,1, 1, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 5, 5, 5, 5, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 5],
				[0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1 ,1, 1, 1, 1, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 1, 1, 1 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 4, 4, 4, 4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 5],
				[0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1 ,1, 1, 1, 1, 1 ,1, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 1, 1, 1, 1 ,1, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 4, 4, 4, 4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 5],
				[0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1 ,1, 1, 1, 1, 1 ,1, 1, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 1, 1, 1, 1 ,1, 1, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 4, 4, 4, 4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 5],
				[0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1 ,1, 1, 1, 1, 1 ,1, 1, 0, 0, 0 ,0, 0, 0, 0, 0 ,1, 1, 1, 1, 1 ,1, 1, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 4, 4, 4, 4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 5],
				[0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0 ,1, 1, 1, 1, 1 ,1, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,1, 1, 1, 1, 1 ,1, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 5, 5, 5, 5, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 5],
				[0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0 ,1, 1, 1, 1, 1 ,1, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 1, 1, 1 ,1, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 5, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 5],
				[0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 1, 1, 1 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 5, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 4, 4, 4 ,4, 4, 5],
				[0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 5, 5, 5, 5, 5 ,5, 5, 5, 5, 5, 5, 5, 5 ,5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
				[0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0],
				[0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0],
				[0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0 ,0, 0, 0, 3, 3 ,3, 0, 0, 0, 0 ,0, 0, 0],
				[3, 3, 3, 3, 3, 3, 3 ,3, 3, 3, 3, 3, 3, 3, 3, 3, 3 ,3, 3, 3, 3, 3 ,3, 3, 3, 3, 3 ,3, 3, 3, 3, 3 ,3, 3, 3, 3, 3 ,3, 3, 3, 3, 3, 3, 3, 3, 3, 3 ,3, 3, 3, 3, 3, 3, 3, 3, 3, 3 ,3, 3, 3, 3, 3 ,3, 3, 3, 3, 3 ,3, 3, 3, 3, 3 ,3, 3, 3],
				[3, 3, 2, 2, 2, 3, 3 ,3, 2, 2, 2, 3, 3, 3, 3, 2, 3 ,3, 2, 2, 3, 2 ,2, 2, 3, 3, 3 ,2, 2, 2, 2, 3 ,2, 2, 3, 2, 2 ,2, 2, 3, 3, 3, 3, 2, 2, 2, 2 ,2, 2, 2, 2, 2, 3, 3, 2, 3, 2 ,2, 2, 2, 2, 2 ,3, 2, 3, 3, 2 ,3, 3, 3, 2, 3 ,2, 2, 2],
				[2, 3, 2, 3, 2, 3, 2 ,3, 2, 2, 3, 3, 2, 2, 2, 2, 2 ,2, 2, 2, 2, 3 ,2, 2, 2, 3, 2 ,3, 2, 3, 3, 3 ,2, 2, 2, 2, 3 ,2, 2, 3, 2, 2, 2, 2, 2, 3, 2 ,2, 2, 3, 3, 2, 2, 3, 2, 2, 2 ,2, 3, 2, 2, 2 ,2, 2, 3, 2, 2 ,2, 2, 3, 2, 2 ,2, 2, 2],
				[2, 2, 2, 2, 2, 2, 2 ,2, 6, 2, 2, 2, 2, 2, 3, 6, 6 ,2, 2, 2, 2, 6 ,2, 3, 2, 2, 2 ,2, 2, 2, 2, 2 ,2, 2, 2, 2, 2 ,2, 6, 2, 2, 3, 2, 2, 2, 2, 2 ,2, 2, 2, 2, 2, 2, 2, 2, 2, 2 ,2, 2, 2, 2, 2 ,2, 2, 2, 2, 2 ,2, 2, 2, 2, 3 ,2, 2, 6],
				[2, 2, 2, 2, 2, 2, 2 ,2, 6, 2, 2, 2, 2, 2, 3, 6, 6 ,2, 2, 2, 6, 6 ,2, 2, 2, 2, 2 ,6, 2, 2, 6, 2 ,2, 2, 2, 2, 2 ,6, 6, 2, 2, 6, 2, 2, 2, 6, 2 ,2, 2, 6, 2, 2, 2, 2, 6, 2, 2 ,6, 6, 2, 6, 2 ,2, 2, 6, 2, 2 ,2, 2, 2, 2, 3 ,2, 6, 6],
				[6, 6, 6, 6, 2, 2, 6 ,6, 6, 2, 6, 2, 2, 2, 3, 6, 6 ,6, 6, 6, 6, 6 ,2, 2, 2, 6, 6 ,6, 6, 6, 6, 2 ,2, 2, 6, 6, 6 ,6, 6, 2, 6, 6, 6, 2, 6, 6, 2 ,2, 6, 6, 6, 6, 2, 6, 6, 6, 6 ,6, 6, 6, 6, 6 ,6, 6, 6, 2, 2 ,6, 6, 6, 6, 6 ,6, 6, 6],
				[6, 6, 6, 6, 2, 6, 6 ,6, 6, 6, 6, 6, 2, 2, 6, 6, 6 ,6, 6, 6, 6, 6 ,6, 2, 6, 6, 6 ,6, 6, 6, 6, 6 ,6, 6, 6, 6, 6 ,6, 6, 6, 6, 6, 6, 6, 6, 6, 6 ,6, 6, 6, 6, 6, 6, 6, 6, 6, 6 ,6, 6, 6, 6, 6 ,6, 6, 6, 6, 6 ,6, 6, 6, 6, 6 ,6, 6, 6],
				[6, 6, 6, 6, 6, 6, 6 ,6, 6, 6, 6, 6, 6, 6, 6, 6, 6 ,6, 6, 6, 6, 6 ,6, 6, 6, 6, 6 ,6, 6, 6, 6, 6 ,6, 6, 6, 6, 6 ,6, 6, 6, 6, 6, 6, 6, 6, 6, 6 ,6, 6, 6, 6, 6, 6, 6, 6, 6, 6 ,6, 6, 6, 6, 6 ,6, 6, 6, 6, 6 ,6, 6, 6, 6, 6 ,6, 6, 6],
				[6, 6, 6, 6, 6, 6, 6 ,6, 6, 6, 6, 6, 6, 6, 6, 6, 6 ,6, 6, 6, 6, 6 ,6, 6, 6, 6, 6 ,6, 6, 6, 6, 6 ,6, 6, 6, 6, 6 ,6, 6, 6, 6, 6, 6, 6, 6, 6, 6 ,6, 6, 6, 6, 6, 6, 6, 6, 6, 6 ,6, 6, 6, 6, 6 ,6, 6, 6, 6, 6 ,6, 6, 6, 6, 6 ,6, 6, 6],
			];
			
			
			//read map array and then draw corresponding tile
			ctx.save();		
			for (var x =0, i = 0; i < mapArray.length; x+=40, i++) {		
				ctx.beginPath();
				for (var y = 0, j = 0; j < mapArray[i].length; y+=40, j++) {    
					var temp = mapArray[i][j];
					if (temp == 0){
						ctx.fillStyle = "#5D732F";//light green
						ctx.fillRect (y, x, tileSize, tileSize);
					} else if (temp == 1){
						ctx.fillStyle = "#2C4001";//dark green
						ctx.fillRect (y, x, tileSize, tileSize);
					} else if (temp == 2){
						ctx.fillStyle = "#A3835A";//light brown
						ctx.fillRect (y, x, tileSize, tileSize);
					} else if (temp == 3){
						ctx.fillStyle = "#704C3E";//dark brown
						ctx.fillRect (y, x, tileSize, tileSize);
					} else if (temp == 4){
						ctx.fillStyle = "#839196";//light gray
						ctx.fillRect (y, x, tileSize, tileSize);
						ctx.moveTo(y + (tileSize/2), x);
						ctx.lineTo(y + (tileSize/2), x + tileSize);
						ctx.moveTo(y , x + (tileSize/2));
						ctx.lineTo(y + tileSize, x + (tileSize/2));
						ctx.strokeStyle="#545D61";
						ctx.lineWidth=2;
						ctx.stroke();
					} else if (temp == 5){
						ctx.fillStyle = "#545D61";//dark gray
						ctx.fillRect (y, x, tileSize, tileSize);
						var myTile = {x:y, y:x, c:true, s:tileSize};
						this.tileArray.push(myTile);
						//console.log(this.tileArray);
					} else if (temp == 6){
						ctx.fillStyle = "#3CDBF5";//light blue
						ctx.fillRect (y, x, tileSize, tileSize);
					} else {
						ctx.fillStyle = "#ff1d8e";//Missing Color
						ctx.fillRect (y, x, tileSize, tileSize);
					}
				}
				ctx.closePath();
			}
			ctx.restore();	
			
			/*
			var color = "#2C4001";				
			ctx.save();			
			ctx.fillStyle = "#2C4001";		    
			for (var x = 0, i = 0; i < rows; x+=42, i++) {
				ctx.beginPath();
				for (var y = 0, j=0; j < columns; y+=42, j++) {            
					ctx.rect (x, y, 40, 40);
				}
				color = (color == "#2C4001" ? "#5D732F" : "#2C4001");
				ctx.fillStyle = color;
				ctx.fill();
				ctx.closePath();
			}		
			ctx.restore();	 */
			   
			
			// store the generate map as this image texture
			this.image = new Image();
			this.image.src = ctx.canvas.toDataURL("image/png");
			
			// clear context
			ctx = null;
		}
		
		Map.prototype.tileArr = function(){
			//console.log(this.tileArray);
			return this.tileArray;
		}
		
		// draw the map adjusted to camera
		Map.prototype.draw = function(context, xView, yView){					
			// easiest way: draw the entire map changing only the destination coordinate in canvas
			// canvas will cull the image by itself (no performance gaps -> in hardware accelerated environments, at least)
			//context.drawImage(this.image, 0, 0, this.image.width, this.image.height, -xView, -yView, this.image.width, this.image.height);
			
			// didactic way:
			
			var sx, sy, dx, dy;
            var sWidth, sHeight, dWidth, dHeight;
			
			// offset point to crop the image
			sx = xView;
			sy = yView;
			
			// dimensions of cropped image			
			sWidth =  context.canvas.width;
			sHeight = context.canvas.height;

			// if cropped image is smaller than canvas we need to change the source dimensions
			if(this.image.width - sx < sWidth){
				sWidth = this.image.width - sx;
			}
			if(this.image.height - sy < sHeight){
				sHeight = this.image.height - sy; 
			}
			
			// location on canvas to draw the croped image
			dx = 0;
			dy = 0;
			// match destination with source to not scale the image
			dWidth = sWidth;
			dHeight = sHeight;									
			
			context.drawImage(this.image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);			
		}
		
		// add "class" Map to our Game object
		Game.Map = Map;
		
	})();
	(function(){
		function UI(x,y){
			this.x = x;
			this.y = y;
		}
		

		UI.prototype.update = function(pH,pA){
			//Grab UI Variables
			this.pHealth = pH;
			this.pArmor = pA;	
		}
		
		UI.prototype.draw = function(context,  xView, yView, canvasW){	
			// draw a simple rectangle shape as our UI model
			context.save();		
			context.beginPath();
			context.rect(this.x, this.y, canvasW, 70);
			context.fillStyle = '#D0D0D0';
			context.fill();
			context.beginPath();
			context.rect(this.x, this.y, canvasW, 10);
			context.fillStyle = '#606060';
			context.fill();
			
			//draw health bar
			context.beginPath();
			context.font = "18px Arial";
			context.fillStyle = '#606060';
			context.fillText("Health",canvasW - 700, this.y + 26);
			context.rect(canvasW - 700, this.y + 40, this.pHealth * 3, 15);
			if(this.pHealth > 60){
				context.fillStyle="green"
			}else if(this.pHealth > 40){
				context.fillStyle="gold"
			}else if(this.pHealth > 20){
				context.fillStyle="orange";
			}else{
				context.fillStyle="red";
			}
			context.fill();
			//draw armor bar
			context.beginPath();
			context.font = "18px Arial";
			context.fillStyle = '#606060';
			context.fillText("Armor",canvasW - 350, this.y + 26);
			context.rect(canvasW - 350, this.y + 40, this.pArmor * 3, 15);
			context.fillStyle = 'blue';
			context.fill();
			
			//draw weapon stats
			context.beginPath();
			context.font = "18px Arial";
			context.fillStyle = '#606060';
			
			context.fillText("Weapon", 50, this.y + 26);
			context.fillText("Ammo", 200, this.y + 26);
			
			context.font = "30px Arial";
			context.fillText("AK-47", 40, this.y + 60);
			context.fillText("30/30", 190, this.y + 60);
			
			//draw pick ups
			context.font = "18px Arial";
			context.fillText("Pick ups", 400, this.y + 26);
			
			context.restore();			
		}
		
		// add "class" UI to our Game object
		Game.UI = UI;
		
	})();

	// Game Script
	(function(){
		// prepaire our game canvas
		var canvas = document.getElementById("m-canvas");
		var context = canvas.getContext("2d");

        // game settings: // <-- some game settings were removed because requestAnimationFrame controls the screen automatically
        var last = 0; // last frame timestamp
        var now = 0; // current timestamp
        var step = now-last; // time between frames
		
		// setup an object that represents the room
		var room = {
			width: 3000,
			height: 3000,
			map: new Game.Map(3000, 3000)
		};
		
		// generate a large image texture for the room
		room.map.generate();
		
		 //setup UI
		 var ui = new Game.UI(0, 740);
		 
		// setup player
		var player = new Game.Player(60, 60);
		var zed = new Game.Zed(500, 500);

		
		// setup the magic camera !!!
		var camera = new Game.Camera(0, 0, canvas.width, canvas.height, room.width, room.height);		
		camera.follow(player, canvas.width/2, canvas.height/2);
		
		// Game update function
		var update = function(step){ 
			player.update(step, room.width, room.height, zed.x, zed.y, zed.r(), room.map.tileArr()); // <-- edited
			zed.update(step, room.width, room.height, player.x, player.y);
			ui.update(player.health, player.armor);
			camera.update();
			//zedAI.track(step);
		}
			
		// Game draw function
		var draw = function(){
			// clear the entire canvas
			context.clearRect(0, 0, canvas.width, canvas.height);
			
			// redraw all objects
			room.map.draw(context, camera.xView, camera.yView);		
			player.draw(context, camera.xView, camera.yView);		
			zed.draw(context, camera.xView, camera.yView);		
			ui.draw(context, camera.xView, camera.yView, canvas.width);					
		}
        
        var runningId = -1;
		
		// Game Loop
		var gameLoop = function(timestamp){ // <-- edited; timestamp comes from requestAnimationFrame. See polyfill to get this insight.
            now = timestamp; // <-- current timestamp (in milliseconds)
            step = (now-last)/1000; // <-- time between frames (in seconds)
            last = now; // <-- store the current timestamp for further evaluation in next frame/step 
            
			update(step);
			draw();
            runningId = requestAnimationFrame(gameLoop); // <-- added
		}	
		
        // ---configure play/pause capabilities:
		
		Game.play = function(){	
			if(runningId == -1){
				runningId = requestAnimationFrame(gameLoop); // <-- changed
				console.log("play");
			}
		}
		
		Game.togglePause = function(){		
			if(runningId == -1){
				Game.play();
			}
			else
			{
				cancelAnimationFrame(runningId);// <-- changed
				runningId = -1;
				console.log("paused");
			}
		}	
		
		// ---
		
	})();

	// <-- configure Game controls:

	Game.controls = {
		left: false,
		up: false,
		right: false,
		down: false,
	};

	window.addEventListener("keydown", function(e){
		switch(e.keyCode)
		{
			case 37: // left arrow
				Game.controls.left = true;
				break;
			case 38: // up arrow
				Game.controls.up = true;
				break;
			case 39: // right arrow
				Game.controls.right = true;
				break;
			case 40: // down arrow
				Game.controls.down = true;
				break;
		}
	}, false);

	window.addEventListener("keyup", function(e){
		switch(e.keyCode)
		{
			case 37: // left arrow
				Game.controls.left = false;
				break;
			case 38: // up arrow
				Game.controls.up = false;
				break;
			case 39: // right arrow
				Game.controls.right = false;
				break;
			case 40: // down arrow
				Game.controls.down = false;
				break;
			case 80: // key P pauses the game
				Game.togglePause();
				break;		
		}
	}, false);

	// -->

	// start the game when page is loaded
	window.onload = function(){	
		Game.play();
	}
