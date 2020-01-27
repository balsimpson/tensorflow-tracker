const storageKey = "knnClassifier";
const classifier = loadClassifierFromLocalStorage();

let net;
let labels = [];
let models = [];

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
	document.getElementById('preloader').classList.add('hide');
	console.log('Successfully loaded video');
	
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
	// document.getElementById('class-a').addEventListener('click', () => addExample('class-a'));
	// document.getElementById('class-b').addEventListener('click', () => addExample('class-b'));
	// document.getElementById('class-c').addEventListener('click', () => addExample('class-c'));

	document.getElementById('clearall').addEventListener('click', async () => {
		let res = await clearAll(classifier);
		console.log(res);
	});

	document.getElementById('saveModel').addEventListener('click', () => saveClassifierInLocalStorage(classifier));



	document.getElementById('labels_container').addEventListener('click', (e) => {
		if (e.target.classList.contains('btn')) {
			console.log(e.target.id);
			addExample(e.target.id);
		}
	});

	// document.getElementById('getModel').addEventListener('click', (e) => loadClassifierFromLocalStorage());

	document.getElementById('add_label_form').addEventListener('submit', (event) => addLabelBtnClick(event));
	document.getElementById('add_label_btn').addEventListener('click', (event) => addLabelBtnClick(event));

	while (true) {
		if (classifier.getNumClasses() > 0) {
			const img = await webcam.capture();
			// Get the activation from mobilenet from the webcam.
			const activation = net.infer(img, 'conv_preds');
			// Get the most likely class and confidences from the classifier module.
			const result = await classifier.predictClass(activation);

			const classes = ['A', 'B', 'C'];
			// document.getElementById('console').innerText = `
			// 			prediction: ${classes[result.label]} | ${result.confidences[result.label].toFixed(2)}
			// 			`;

			// console.log('result:', result);
			let predictionTxt = '';
			if (result.classIndex !== undefined) {
				predictionTxt = `
				prediction: ${[result.label]} | ${result.confidences[result.label].toFixed(2)}
				`
			}
			
			document.getElementById('console').innerText = predictionTxt;
			// Dispose the tensor to release the memory.
			img.dispose();
		}

		await tf.nextFrame();
	}
}

function addLabelBtnClick(event) {
	event.preventDefault();
	let label = document.getElementById('label_name').value;

	if (label) {
		addLabel(label);
		document.getElementById('label_name').value = '';
		document.getElementById('label_name').classList.remove('valid');
	}
}

async function clearAll(classifier) {
	classifier.clearAllClasses()
}

async function saveClassifierInLocalStorage(classifier) {
	console.log('saving...');

	let save_data = {
		labels: [],
		models: []
	}


	const dataset = classifier.getClassifierDataset();
	const datasetOjb = await toDatasetObject(dataset);
	const jsonStr = JSON.stringify(datasetOjb);
	//can be change to other source
	localStorage.setItem(storageKey, jsonStr);
}

function loadClassifierFromLocalStorage() {
	console.log('loading...');
	const classifier = new knnClassifier.KNNClassifier();
	const datasetJson = localStorage.getItem(storageKey);
	if (datasetJson) {
		const datasetObj = JSON.parse(datasetJson);
		const dataset = fromDatasetObject(datasetObj);
		console.log('dataset:', dataset);
		classifier.setClassifierDataset(dataset);
		let labelcount = classifier.getClassExampleCount();
		console.log(labelcount);
	}
	return classifier;
}

function addLabel(label) {
	
	let labels_container = document.getElementById('labels_container');
	
	
	labels.push({
		name: label,
		count: 0
	})

	labels_container.innerHTML += `<button class="btn btn-small waves-effect waves-light blue-grey darken-1" id=${label}>${label}</button>`;
}

function renderLabel() {
	label_container.appendChild(label);
}

app();