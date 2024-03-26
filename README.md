# ImageSequenceCanvasPlayer
JavaScript image sequence player rendered to canvas.

```
	// How to use:
	import ImageSequenceCanvasPlayer from './ImageSequenceCanvasPlayer.js'
	const player = new ImageSequenceCanvasPlayer('#myCanvas', ['image1.jpg', 'image2.jpg'], {
		framesPerSecond: 10,
		playOnLoad: true,
		loop: true,
		onFrameChange: (frameIndex) => console.log(`Frame changed to ${frameIndex}`),
		onLoad: () => console.log('Images loaded'),
	});
```
