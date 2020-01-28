const storageKey = "knnClassifier";

let net;
let labels = [];
let models = [];

const classifier = loadClassifierFromLocalStorage();
const webcamElement = document.getElementById('webcam');

async function toDatasetObject(dataset) {
	const result = await Promise.all(
		Object.entries(dataset).map(async ([classId, value], index) => {
			const data = await value.data();

			return {
				// classId: Number(classId),
				classId: classId,
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

		// Update label count
		let labels_container = document.getElementById('labels_container');
		// console.log(labels_container.children[classId]);

		labels_container.children[classId].innerHTML = 
		`${classId} (${classifier.getClassExampleCount(classId)[classId]}) <i class="close material-icons" style="
		padding: 0 0 0 10;color: black;" onclick="deleteLabel(event)">close</i>`
		// labels_container.children[classId].innerHTML = 
		// `<button class="btn btn-small waves-effect waves-light blue-grey darken-1" id=${labels[classId].name} style="display: inline-flex;">${labels[classId].name} (${classifier.getClassExampleCount(classId)[classId]})<i class="close material-icons" style="padding: 0 0 0 10;color: black;" onclick="deleteLabel(event)">close</i>`
		const dataset = classifier.getClassifierDataset();
		const datasetOjb = await toDatasetObject(dataset);

		console.log(datasetOjb);
		// console.log(classifier.getClassExampleCount(classId)[classId]);
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

	document.getElementById('saveModel').addEventListener('click', (event) => saveClassifierInLocalStorage(event, classifier));

	document.getElementById('labels_container').addEventListener('click', (e) => {
		if (e.target.classList.contains('btn')) {
			let index;
			let id = e.target.id;
			// get index of the label
			for (key in labels) {
				if (labels[key].name == id) {
					index = key;
					console.log(labels[key]);
					labels[key].count++;
					addExample(labels[key].name);
				}
			}
		}
	});

	// document.getElementById('getModel').addEventListener('click', (e) => loadClassifierFromLocalStorage());

	document.getElementById('add_label_form').addEventListener('submit', (event) => addLabelBtnClick(event));
	document.getElementById('add_label_btn').addEventListener('click', (event) => addLabelBtnClick(event));
	
	document.getElementById('clearsaveddata').addEventListener('click', (event) => clearSavedData(event));

	while (true) {
		if (classifier.getNumClasses() > 0) {
			const img = await webcam.capture();
			// Get the activation from mobilenet from the webcam.
			const activation = net.infer(img, 'conv_preds');
			// Get the most likely class and confidences from the classifier module.
			const result = await classifier.predictClass(activation);
			// console.log(result);
			let predictionTxt = '';

			let labels_arr = Object.keys(labels);
			// if (result.classIndex !== undefined) {
				// console.log(labels[result.label]);
				predictionTxt = `
				<strong>${labels_arr[result.label] || [result.label] || ''}</strong>
				<div id="add_label_btn" class="btn btn-small blue-grey darken-3">${result.confidences[result.label].toFixed(2)}</div>
				`
			// }

			document.getElementById('console').innerHTML = predictionTxt;
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

function deleteLabel(event) {
	// console.log(labels);
	// console.log(event.target.parentElement.id);
	let id = event.target.parentElement.id;
	let labels_container = event.target.parentElement.parentElement;
	let label = event.target.parentElement;
	labels_container.removeChild(label);
	classifier.clearClass(id);
	// get label examples count

	// for (key in labels) {
	// 	let example_count = classifier.getClassExampleCount(key);
	// 	console.log(key, example_count);
	// 	if (classifier.getNumClasses() > 0) {
	// 		if (labels[key].name == id) {
	// 			classifier.clearClass(key);
	// 			console.log('class cleared')
	// 			labels.splice(key, 1);
	// 		}
	// 	} else {
	// 		console.log('class not cleared')
	// 		labels.splice(key, 1);
	// 	}
	// }
	console.log('labels', labels);
}

async function clearAll(classifier) {
	classifier.clearAllClasses()
}

async function clearSavedData(event) {
	event.preventDefault();
	const jsonStr = JSON.stringify([]);
	localStorage.setItem(storageKey, jsonStr);
}

async function saveClassifierInLocalStorage(event, classifier) {

	event.preventDefault();
	let model_name = document.getElementById('model_name').value;

	if (model_name) {
		console.log('saving...' + model_name);
		const dataset = classifier.getClassifierDataset();
		const datasetOjb = await toDatasetObject(dataset);

		console.log(classifier.getClassExampleCount());

		let model_data = {
			name: model_name,
			labels: classifier.getClassExampleCount(),
			model: datasetOjb
		}

		models.push(model_data);
		
		const jsonStr = JSON.stringify(models);
		localStorage.setItem(storageKey, jsonStr);
	} else {
		console.log('model name cannot be empty');
	}

}

function loadClassifierFromLocalStorage() {
	console.log('loading...');
	const classifier = new knnClassifier.KNNClassifier();

	let saved_data = localStorage.getItem(storageKey);
	// console.log(saved_data);
	
	if (saved_data) {
		const data = JSON.parse(saved_data);

		models = data ? data : [];
		console.log(models);

		if (data && data.length) {
			const dataset = fromDatasetObject(data[0].model);
			labels = data[0].labels;
			console.log('dataset:', dataset);
			classifier.setClassifierDataset(dataset);

		}
	}
	return classifier;
}
// function loadClassifierFromLocalStorage() {
// 	console.log('loading...');
// 	const classifier = new knnClassifier.KNNClassifier();
// 	const datasetJson = localStorage.getItem(storageKey);
// 	if (datasetJson) {
// 		const datasetObj = JSON.parse(datasetJson);
// 		const dataset = fromDatasetObject(datasetObj);
// 		console.log('dataset:', dataset);
// 		classifier.setClassifierDataset(dataset);
// 		let labelcount = classifier.getClassExampleCount();
// 		console.log(labelcount);
// 	}
// 	return classifier;
// }

function addLabel(label) {

	let labels_container = document.getElementById('labels_container');

	labels.push({
		name: label,
		count: 0,
		classIndex: labels.length-1
	})

	labels_container.innerHTML += `<button class="btn btn-small waves-effect waves-light blue-grey darken-1" id=${label} style="
    display: inline-flex;">${label} (0)<i class="close material-icons" style="
    padding: 0 0 0 10;color: black;" onclick="deleteLabel(event)">close</i>`;
}

app();