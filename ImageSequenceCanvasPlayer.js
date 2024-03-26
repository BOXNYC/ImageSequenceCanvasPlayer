/**
	// How to use:
	import ImageSequenceCanvasPlayer from './ImageSequenceCanvasPlayer.js'
	const player = new ImageSequenceCanvasPlayer('#myCanvas', ['image1.jpg', 'image2.jpg'], {
		framesPerSecond: 10,
		playOnLoad: true,
		loop: true,
		onFrameChange: (frameIndex) => console.log(`Frame changed to ${frameIndex}`),
		onLoad: () => console.log('Images loaded'),
	});
*/
export default class ImageSequenceCanvasPlayer {
	constructor(canvasSelector, imageUrls, options = {}) {
		// Options with default values
		this.options = {
			framesPerSecond: 25,
			onFrameChange: null,
			onLoadProgress: null,
			onLoad: null,
			onLoop: null,
			imageFillMode: 'cover', // options: 'fill', 'cover', or 'contain'
			objectPosition: 'center center', // option pairs: 'center', 'top', 'right', 'bottom', and 'left'
			playOnLoad: false,
			renderFirstImageOnLoad: true,
			sizeToFirstImage: false,
			loop: false,
			parent: document.body,
			firstFrameIndex: 0,
			width: null,
			height: null,
			crossOrigin: false,
			...options
		};
		this.canvas = typeof canvasSelector === 'object' ?
			canvasSelector : document.querySelector(canvasSelector);
		if (!this.canvas) {
			this.canvas = document.createElement('canvas');
			this.options.parent.appendChild(this.canvas);
		} else {
			this.options.parent = this.canvas.parentNode;
		}
		if (this.options.width !== null) this.canvas.width = this.options.width;
		if (this.options.height !== null) this.canvas.height = this.options.height;
		this.ctx = this.canvas.getContext('2d');
		this.imageUrls = typeof imageUrls === 'object' && Array.isArray(imageUrls) ?
			imageUrls : ImageSequenceCanvasPlayer.obURLsToArray(imageUrls);
		this.images = [];
		this.loadedImagesCount = 0;
		this.currentFrameIndex = this.options.firstFrameIndex;
		this.isPlaying = false;
		this.animationFrameId = null;
		
		this.loadImages();
	}
	
	static obURLsToArray(info = {}, every = 1) {
		const warn = msg => {
			console.warn("Can’t parse the file sequence correctly, returning [].\nReason: " + msg);
		}
		const out = [];
		const {from: first, to: last} = info;
		if (!first || !last) {
			warn("First and last properties are required.");
			return out
		}
		const lastNumber = filename => {
			const m = filename.match(/\d+(?!.*\d)/g);
			if (m === null) return ""
			return m[0]
		}
		const basenameBefore = (filename, lastNum) => {
			const m = filename.match(new RegExp(`.*(?=${lastNum})`));
			if (m === null) return ""
			return m.join("")
		}
		const basenameAfter = (filename, lastNum) => {
			const m = filename.match(new RegExp(`[^${lastNum}]+$`));
			if (m === null) return ""
			return m[0]
		}
		const a = lastNumber(first);
		if (a === "") {
			warn("the first filename doesn’t contain a number.");
			return out
		}
		const b = lastNumber(last);
		if (b === "") {
			warn("the last filename doesn’t contain a number.");
			return out
		}
		const before = basenameBefore(first, a);
		const after = basenameAfter(first, a);
		if (before !== basenameBefore(last, b) || after !== basenameAfter(last, b)) {
			warn("the base-names of '" + first + "' and '" + last + "' don’t match.");
			return out
		}
		const hasLeadingZeroes = a.charAt(0) == 0 || b.charAt(0) == 0;
		if (hasLeadingZeroes && a.length != b.length) {
			warn("wrong number of leading zeros.");
			return out
		}
		const numA = parseInt(a);
		const numB = parseInt(b);
		for (let i=numA; i<=numB; i+=every)
			out.push(before + (i + "").padStart(a.length, "0") + after);
		return out
	}
	
	loadImages() {
		this.images = this.imageUrls.map((url, index) => {
			const img = new Image();
			if (this.options.crossOrigin) img.crossOrigin = this.options.crossOrigin;
			img.onload = () => this.handleImageLoad(index);
			img.src = url;
			return img;
		});
	}
	
	handleImageLoad(index) {
		this.loadedImagesCount++;
		if (this.options.onLoadProgress) {
			this.options.onLoadProgress(this.loadedImagesCount / this.imageUrls.length);
		}
		
		if (this.loadedImagesCount === this.imageUrls.length) {
			if (this.options.sizeToFirstImage) {
				const {width, height} = this.images[this.options.firstFrameIndex];
				this.canvas.width = this.options.width = width;
				this.canvas.height = this.options.height = height;
			}
			
			if (this.options.onLoad) {
				this.options.onLoad();
			}
			
			if (this.options.renderFirstImageOnLoad) {
				this.renderFrame(this.options.firstFrameIndex);
			}
			
			if (this.options.playOnLoad) {
				this.play();
			}
		}
	}
	
	static drawImageWithObjectFit(ctx, img, objectFit = 'cover', objectPosition = 'center center') {
		ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
		
		let posX = 0;
		let posY = 0;
		let imgWidth = img.width;
		let imgHeight = img.height;
		
		const canvasRatio = ctx.canvas.width / ctx.canvas.height;
		const imgRatio = img.width / img.height;
		
		if (objectFit === 'contain' || objectFit === 'cover') {
			const doCover = objectFit === 'cover';
			if ((imgRatio > canvasRatio && doCover) || (imgRatio < canvasRatio && !doCover)) {
				// Image ratio is wider than canvas ratio
				imgWidth = ctx.canvas.height * imgRatio;
				imgHeight = ctx.canvas.height;
			} else {
				// Image ratio is narrower than canvas ratio
				imgWidth = ctx.canvas.width;
				imgHeight = ctx.canvas.width / imgRatio;
			}
		}
		
		// Calculate position
		const positions = objectPosition.split(' ');
		positions.forEach(pos => {
			switch (pos) {
				case 'left':
					posX = 0;
					break;
				case 'right':
					posX = ctx.canvas.width - imgWidth;
					break;
				case 'top':
					posY = 0;
					break;
				case 'bottom':
					posY = ctx.canvas.height - imgHeight;
					break;
				case 'center':
					if (positions.includes('left') || positions.includes('right')) {
						posY = (ctx.canvas.height - imgHeight) / 2;
					} else if (positions.includes('top') || positions.includes('bottom')) {
						posX = (ctx.canvas.width - imgWidth) / 2;
					} else {
						posX = (ctx.canvas.width - imgWidth) / 2;
						posY = (ctx.canvas.height - imgHeight) / 2;
					}
					break;
			}
		});
	
		ctx.drawImage(img, posX, posY, imgWidth, imgHeight);
	}
	
	renderFrame(frameIndex) {
		const img = this.images[frameIndex];
		ImageSequenceCanvasPlayer.drawImageWithObjectFit(this.ctx, img, this.options.imageFillMode, this.options.objectPosition);
		if (this.options.onFrameChange) {
			this.options.onFrameChange(frameIndex);
		}
	}
	
	play(delay = 0) {
		if (delay) {
			setTimeout(()=>this.play(), delay);
			return;
		}
		if (this.isPlaying) return;
		this.isPlaying = true;
		
		const playFrame = () => {
			this.renderFrame(this.currentFrameIndex);
			this.currentFrameIndex++;
			if (this.currentFrameIndex >= this.images.length) {
				if (this.options.loop) {
					this.currentFrameIndex = 0;
					if (this.options.onLoop) this.options.onLoop();
				} else {
					this.pause();
					return;
				}
			}
			
			this.animationFrameId = setTimeout(playFrame, 1000 / this.options.framesPerSecond);
		};
		
		playFrame();
	}
	
	togglePlay(delay = 0) {
		this.isPlaying ? this.pause(delay) : this.play(delay);
	}
	
	pause(delay = 0) {
		if (delay) {
			setTimeout(()=>this.pause(), delay);
			return;
		}
		if (!this.isPlaying) return;
		clearTimeout(this.animationFrameId);
		this.isPlaying = false;
	}
	
	resume(delay = 0) {
		if (delay) {
			setTimeout(()=>this.resume(), delay);
			return;
		}
		if (this.isPlaying) return;
		this.play();
	}
}
