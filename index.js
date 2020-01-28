const storageKey = "knnClassifier";
// const classifier = loadClassifierFromLocalStorage();
const classifier = new knnClassifier.KNNClassifier();

let net;

const webcamElement = document.getElementById('webcam');

async function toDatasetObject(dataset) {
	const result = await Promise.all(
		Object.entries(dataset).map(async ([classId, value], index) => {
			const data = await value.data();

			return {
				classId: Number(classId),
				data: Array.from(data),
				shape: value.shape
			};
		})
	);
	console.log('result:', result);
	return result;
};

function fromDatasetObject(datasetObject) {
	return Object.entries(datasetObject).reduce((result, [indexString, { data, shape }]) => {
		const tensor = tf.tensor2d(data, shape);
		const index = Number(indexString);

		result[index] = tensor;

		return result;
	}, {});

}

async function app() {
	console.log('Loading mobilenet..');

	// Load the model.
	net = await mobilenet.load();
	console.log('Successfully loaded model');

	// Create an object from Tensorflow.js data API which could capture image 
	// from the web camera as Tensor.
	const webcam = await tf.data.webcam(webcamElement);

	// Reads an image from the webcam and associates it with a specific class
	// index.
	const addExample = async classId => {
		// Capture an image from the web camera.
		const img = await webcam.capture();

		// Get the intermediate activation of MobileNet 'conv_preds' and pass that
		// to the KNN classifier.
		const activation = net.infer(img, 'conv_preds');

		// Pass the intermediate activation to the classifier.
		classifier.addExample(activation, classId);

		// Dispose the tensor to release the memory.
		img.dispose();
	};

	// When clicking a button, add an example for that class.
	document.getElementById('class-a').addEventListener('click', () => addExample(0));
	document.getElementById('class-b').addEventListener('click', () => addExample(1));
	document.getElementById('class-c').addEventListener('click', () => addExample(2));
	document.getElementById('saveModel').addEventListener('click', () => saveClassifierInLocalStorage(classifier));
	document.getElementById('getModel').addEventListener('click', (e) => loadClassifierFromLocalStorage());

	while (true) {
		if (classifier.getNumClasses() > 0) {
			const img = await webcam.capture();

			// Get the activation from mobilenet from the webcam.
			const activation = net.infer(img, 'conv_preds');
			// Get the most likely class and confidences from the classifier module.
			const result = await classifier.predictClass(activation);

			const classes = ['A', 'B', 'C'];
			document.getElementById('console').innerText = `
						prediction: ${classes[result.label]}\n
						probability: ${result.confidences[result.label]}
						`;

			// Dispose the tensor to release the memory.
			img.dispose();
		}

		await tf.nextFrame();
	}
}

function saveModel() {
	let dataset = classifier.getClassifierDataset();
	let datasetObj = {}
	Object.keys(dataset).forEach((key) => {
		let data = dataset[key].dataSync();
		datasetObj[key] = Array.from(data);
	});
	let jsonStr = JSON.stringify(datasetObj)

	var link = document.createElement('a');
	link.download = "model.json";
	link.href = 'data:text/text;charset=utf-8,' + encodeURIComponent(jsonStr);
	document.body.appendChild(link);
	// link.click();
	// link.remove();
}

function getModel(event) {
	console.log(event)
	var target = event.target || window.event.srcElement;
	var files = target.files;
	var fr = new FileReader();
	if (files.length > 0) {
		fr.onload = function () {
			var dataset = fr.result;
			var tensorObj = JSON.parse(dataset)
			Object.keys(tensorObj).forEach((key) => {
				tensorObj[key] = tf.tensor(tensorObj[key], [tensorObj[key].length / 1024, 1024]);
			})
			classifier.setClassifierDataset(tensorObj);
		}
		fr.readAsText(files[0]);
	}
}



async function saveClassifierInLocalStorage(classifier) {
	console.log('saving...')
	const dataset = classifier.getClassifierDataset();
	const datasetOjb = await toDatasetObject(dataset);
	const jsonStr = JSON.stringify(datasetOjb);
	//can be change to other source
	localStorage.setItem(storageKey, jsonStr);
}

function loadClassifierFromLocalStorage() {
	console.log('loading...')
	const classifier = new knnClassifier.KNNClassifier();

	const datasetJson = localStorage.getItem(storageKey);

	if (datasetJson) {
		const datasetObj = JSON.parse(datasetJson);

		const dataset = fromDatasetObject(datasetObj);

		classifier.setClassifierDataset(dataset);
	}
	return classifier;
}

app();