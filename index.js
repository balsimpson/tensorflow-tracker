const storageKey = "knnClassifier";

let net;
let labels = [];
let models = [];
let modelDB = {};

class Model {
	constructor(name, labels, dataObj) {
		this.name = name;
		// this.labels = labels;
		this.labels = this.updateLabels(labels);
		this.model = dataObj;
	}
	add() {
		models.push(this);
		return this;
	}
	updateLabels(labelsArr) {
		let labels = labelsArr.map(label => {
			return new Label(label.name, label.count, label.id)
		})
		return labels;
	}
	update(labelsArr, updatedModelData) {
		this.labels = labelsArr;
		this.model = updatedModelData;
		return this;
	}
	delete() {
		// delete from models array
		models = models.filter(model => {
			return this.name != model.name;
		})
		return this;
	}
}

class Label {
	constructor(name, count, id) {
		this.name = name;
		this.count = count;
		this.id = id;
	}

	add() {
		labels.push(this);
		return this;
	}

	delete() {
		// delete from labels array
		labels = labels.filter(label => {
			return this.name != label.name;
		})
		return this;
	}

	updateId(id) {
		this.id = id;
		return this;
	}

	updateCount(count) {
		this.count = count;
		return this;
	}

	render() {
		// console.log(this.name);
		let labels_container = document.getElementById('labels_container');

		labels_container.innerHTML += `<button class="btn btn-small waves-effect waves-light blue-grey darken-1" id=${this.name} style="display: inline-flex;">${this.name} (${this.count})<i class="close material-icons" style="padding: 0 0 0 10;color: black;" onclick="deleteLabel(event, ${this.name})">close</i>`;
		return this;
	}
}

const capture = () => {
	// add canvas element
	const canvas = document.createElement('canvas');
	document.querySelector('body').appendChild(canvas);

	// set canvas dimensions to video ones to not truncate picture
	const videoElement = document.querySelector('#webcam');
	canvas.width = videoElement.width;
	canvas.height = videoElement.height;

	// copy full video frame into the canvas
	canvas.getContext('2d').drawImage(videoElement, 0, 0, videoElement.width, videoElement.height);

	// get image data URL and remove canvas
	const snapshot = canvas.toDataURL("image/png");
	canvas.parentNode.removeChild(canvas);

	const img = document.createElement('img');
	img.setAttribute('src', snapshot);
	document.querySelector('#confusion_matrix').appendChild(img);
	// console.log(snapshot);
	// update grid picture source
	// document.querySelector;
};

const classifier = loadClassifierFromLocalStorage();
const webcamElement = document.getElementById('webcam');

async function app() {
	// Load the model.
	net = await mobilenet.load();
	console.log('Successfully loaded mobilenet');

	const webcam = await tf.data.webcam(webcamElement);
	console.log('Successfully loaded video');

	getEl('preloader').classList.add('hide');

	let label_count = 0;

	const addExample = async (classId, label_name) => {
		// console.log('classId: ', classId);
		const img = await webcam.capture();
		const activation = net.infer(img, 'conv_preds');

		classifier.addExample(activation, label_name);

		label_count = classifier.getClassExampleCount()[label_name];
		// console.log('label_count', label_count);

		let [label] = labels.filter(l => {
			return l.name === label_name;
		})

		label.updateCount(label_count)
			.updateId(classId);

		// Update current model
		updateModel();
		// updateClassifierInLocalStorage(event, classifier);

		// Update label count
		let labels_container = document.getElementById('labels_container');

		labels_container.children[classId].innerHTML =
			`${label_name} (${label_count}) <i class="close material-icons" style="padding: 0 0 0 10;color: black;" onclick="deleteLabel(event)">close</i>`

		// Dispose the tensor to release the memory.
		img.dispose();
	};


	// Clear all labels from current model
	getEl('clearall').addEventListener('click', async () => clearAll(classifier));

	// delete all data saved in local storage
	getEl('clearsaveddata').addEventListener('click', (event) => clearSavedData(event));

	// save a model with name
	getEl('add_model_form').addEventListener('submit', (event) => saveNewModel(event));

	// load a saved model
	getEl('models_list').addEventListener('change', async function (event) {
		console.log('e:', event.target.value);
		getEl('labels_container').innerHTML = '';
		loadModel(event.target.value, classifier);
	});

	// label button click listener
	getEl('labels_container').addEventListener('click', (event) => {
		if (event.target.classList.contains('btn')) {
			let id = event.target.id;
			labels.forEach((value, index) => {
				if (value.name === id) {
					addExample(index, id);
				}
			});
		}
	});

	getEl('add_label_form').addEventListener('submit', (event) => addNewLabel(event));

	// prediction elements
	let predictions = document.getElementById('console');
	let labelEl = document.getElementById('label');
	let confidenceEl = document.getElementById('confidence');

	let confusionEl = document.getElementById('confusion_matrix');
	console.log(confusionEl.children.length);
	try {
		while (true) {
			if (classifier.getNumClasses() > 0) {
				const img = await webcam.capture();

				// Get the activation from mobilenet from the webcam.
				const activation = net.infer(img, 'conv_preds');
				// Get the most likely class and confidences from the classifier module.
				const result = await classifier.predictClass(activation);


				if (Date.now() % 100 === 0) {
					// console.log(result);
				}
				// console.log(classifier.getClassExampleCount());
				if (result.label !== undefined) {

					let [label] = labels.filter(l => {
						return l.name == result.label;
					})

					let label_name = label ? label.name : '';
					let confidence = result.confidences[result.label];

					// confidence color
					let btn_color = getBtnColor(confidence);

					predictions.setAttribute('style', 'display: block;')
					labelEl.innerHTML = label_name;
					confidenceEl.innerHTML = (confidence * 100).toFixed(0) + '%';
					confidenceEl.setAttribute('style', `color: ${btn_color};`);

					// if (confidence < 1 && confusionEl.children.length < 6) {
					// 	capture();
					// }
				}

				// document.getElementById('console').innerHTML = predictionTxt;
				// Dispose the tensor to release the memory.
				img.dispose();
			}

			await tf.nextFrame();
		}
	} catch (err) {
		console.log(err);
	}

}



function getBtnColor(confidence) {

	if (typeof confidence === 'number') {
		if (confidence > 0.70) {
			btn_color = 'teal';
		}
		else if (confidence > 0.5 && confidence < 0.70) {
			btn_color = 'orange';
		}
		else if (confidence < 0.50) {
			btn_color = 'red';
		}
	}

	// console.log(btn_color);
	return btn_color;
}

function addNewLabel(event) {
	event.preventDefault();
	let label_name = getEl('label_name').value;

	if (label_name) {
		let label = new Label(label_name, 0, '');
		label.add().render();

		getEl('label_name').value = '';
		getEl('label_name').classList.remove('valid');
	} else {
		console.log('label name is empty');
	}
}

async function saveNewModel(event) {
	event.preventDefault();
	let model_name = getEl('model_name').value;

	if (model_name) {
		const dataset = classifier.getClassifierDataset();
		const datasetOjb = await toDatasetObject(dataset);

		let model = new Model(model_name, labels, datasetOjb);
		model.add();

		modelDB.current = model.name;
		modelDB.models = models;

		renderModelSelect(modelDB.models);
		// console.log(modelDB);
		saveToLocalStorage(modelDB);
		toast(`Model ${model.name} saved to local storage!`, 'success');
	} else {
		console.log('model name is empty');
		toast('Model name cannot be empty!', 'error');
	}
}

function loadModel(model_name, classifier) {

	try {


		labels = [];

		let [model] = models.filter(m => {
			return m.name === model_name;
		})

		// console.log('loading ', model_name, model);
		// get model
		const dataset = fromDatasetObject(model.model);
		// update classifier
		classifier.setClassifierDataset(dataset);

		model.labels.forEach(label => {
			// let label = new Label(l.name, l.count, l.id);
			label.add().render();
		});

		// console.log('loaded model', model);
		// console.log('loaded labels', labels);

		toast(`Model ${model.name} is loaded!`, 'info');
		// update current model name
		modelDB.current = model_name;
		modelDB.models = models;

		saveToLocalStorage(modelDB);
	} catch (error) {
		console.log('error: ', error);
	}
}

async function updateModel() {
	// event.preventDefault();
	if (modelDB.current) {
		// console.log('before:', modelDB);
		const dataset = classifier.getClassifierDataset();
		const datasetOjb = await toDatasetObject(dataset);

		let [model] = models.filter(m => {
			return m.name === modelDB.current;
		})

		// console.log('datasetOjb:', datasetOjb, model);
		model.update(labels, datasetOjb);

		modelDB.models = models;
		saveToLocalStorage(modelDB);
		// console.log('after:', modelDB);
	} else {
		console.log('no models saved:', modelDB);
	}
}

function renderLabel(label) {

	let labels_container = document.getElementById('labels_container');

	labels_container.innerHTML += `<button class="btn btn-small waves-effect waves-light blue-grey darken-1" id=${label.name} style="
    display: inline-flex;">${label.name} (${label.count})<i class="close material-icons" style="
    padding: 0 0 0 10;color: black;" onclick="deleteLabel(event)">close</i>`;

}

function deleteLabel(event) {

	let name = event.target.parentElement.id;
	let [label] = labels.filter(l => {
		return l.name === name;
	})

	// console.log('deleting: ', label.id, name);

	if (label.count > 0) {
		classifier.clearClass(name);
	}

	label.delete();
	let labels_container = event.target.parentElement.parentElement;
	labels_container.removeChild(getEl(name));

	// updateClassifierInLocalStorage(event, classifier);
	updateModel();
}

async function clearAll(classifier) {
	classifier.clearAllClasses();
}

async function clearSavedData(event) {
	event.preventDefault();
	toast('Cleared all data from local storage', 'success');
	const jsonStr = JSON.stringify({});
	// console.log('data cleared');
	
	localStorage.setItem(storageKey, jsonStr);
	loadClassifierFromLocalStorage();
	getEl('labels_container').innerHTML = '';
	renderModelSelect([]);
}

async function saveToLocalStorage(dataToSave) {
	const jsonStr = JSON.stringify(dataToSave);
	localStorage.setItem(storageKey, jsonStr);
}

function loadClassifierFromLocalStorage() {

	const classifier = new knnClassifier.KNNClassifier();

	let saved_data = localStorage.getItem(storageKey);
	saved_data = JSON.parse(saved_data);
	// console.log(saved_data);

	if (saved_data && saved_data.models) {

		saved_data.models.forEach(data => {
			let model = new Model(data.name, data.labels, data.model);
			model.add();

			if (models && saved_data.current && saved_data.current === model.name) {
				// console.log('loading model - ', model.name)
				modelDB.current = saved_data.current;
				loadModel(saved_data.current, classifier);
			}
		})

		modelDB.models = models;
		// console.log('modelDB: Updated - ', modelDB);
	}
	return classifier;
}



function getEl(elementId) {
	return document.getElementById(elementId);
}

function toast(message, status) {

	let icon;
	let icon_col;

	switch (status) {
		case 'success':
			icon = 'done';
			icon_col = 'green';
			break;
		case 'error':
			icon = 'error';
			icon_col = 'red';
			break;

		default:
			icon = 'info';
			icon_col = 'white';
			break;
	}

	message = `<i class="material-icons ${icon_col}-text" style="padding-right: 10px">${icon}</i>  ${message}`;

	M.toast({
		html: message,
		// displayLength: 5000000
	});
}

window.onload = () => {
	app();
}

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
	// console.log('toDatasetObject:', result);
	return result;
};

function fromDatasetObject(datasetObject) {
	// console.log('datasetObject:', datasetObject);
	let test = Object.entries(datasetObject).reduce((result, [indexString, { data, shape }]) => {
		const tensor = tf.tensor2d(data, shape);
		const index = Number(indexString);

		let label = datasetObject[indexString].classId;
		result[label] = tensor;
		// result[indexString] = tensor;
		// console.log('result:', result);
		return result;
	}, {});
	// console.log('test:', test)
	return test;
}

async function setupWebcam() {
	console.log('setting up video');
	return new Promise((resolve, reject) => {
		const navigatorAny = navigator;
		navigator.getUserMedia = navigator.getUserMedia ||
			navigatorAny.webkitGetUserMedia || navigatorAny.mozGetUserMedia ||
			navigatorAny.msGetUserMedia;
		if (navigator.getUserMedia) {
			navigator.getUserMedia({ video: true },
				stream => {
					webcamElement.srcObject = stream;
					webcamElement.addEventListener('loadeddata', () => resolve(), false);
				},
				error => reject());
		} else {
			reject();
		}
	});
}
