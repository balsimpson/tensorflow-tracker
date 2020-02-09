const storageKey = "knnClassifier";

class Model {
	constructor(modelLabels, modelData, labelsDivEl) {
		this.labels = modelLabels || [];
		this.data = modelData || undefined;
		this.labelElement = labelsDivEl;
	}

	/* makes a button tag */
	static createLabelItem(label) {
		const labelBtn = document.createElement('button');
		labelBtn.setAttribute('id', label.classId);
		labelBtn.setAttribute('class', 'btn btn-small btn-label waves-effect waves-light blue-grey darken-2');
		labelBtn.setAttribute('style', 'display: inline-flex;');

		labelBtn.textContent = `${label.classId} (${label.count})`;

		const labelClose = document.createElement('i');
		labelClose.setAttribute('class', 'close material-icons blue-grey-text text-lighten-2');
		labelClose.setAttribute('data-name', label.classId);
		labelClose.setAttribute('style', 'padding: 0 0 0 10px;');
		labelClose.textContent = 'close';
		labelBtn.appendChild(labelClose);

		return labelBtn;
	}

	load(model) {

		if (model) {
			this.labels = model.labels || [];
			this.data = model.data || undefined;
		} else {
			console.log('no data to load');
			this.labels = [];
			this.data = undefined;
		}

		this.updateClassifier(this.data);
		this.renderLabels();
		return this;
	}

	updateClassifier(data) {
		if (data) {
			const dataset = fromDatasetObject(data);
			classifier.setClassifierDataset(dataset);
		} else {
			console.log('no data');
			classifier.clearAllClasses();
		}
	}

	update(modelLabels, modelData) {
		let labels = [];
		if (modelLabels.length > 0) {
			for (const labelItem of modelLabels) {
				let label = {
					classId: labelItem.classId,
					count: labelItem.count
				};
				labels.push(label);
			}
		}

		this.labels = labels || this.labels;
		this.data = modelData || this.data;
		return this;
	}

	updateData(modelData) {
		this.data = modelData || this.data;
		return this;
	}

	addLabel(labelName, labelCount = 0) {

		let [labelExists] = this.labels.map(label => {
			return (label.classId === labelName) ? true : false;
		});

		if (labelExists) {
			toast(`${labelName} already exists!`, 'error');
			console.log(name, 'label exists');
			return this;
		} else {
			let label = {
				classId: labelName,
				count: labelCount
			};
			this.labels.push(label);
			this.renderLabels();
			return this;
		}

	}

	async updateLabel(labelName, labelCount) {
		let [label] = this.labels.filter(l => {
			return l.classId === labelName;
		})
		label.count = labelCount;

		this.renderLabels();

		return this;
	}

	async deleteLabel(labelName) {

		let [label] = this.labels.filter(l => {
			return l.classId === labelName;
		})

		this.labels = this.labels.filter(l => {
			return l.classId !== labelName;
		})

		if (label.count > 0) {
			classifier.clearClass(labelName);
		}

		this.renderLabels();
		return this;
	}

	// Render DOM elements
	renderLabels() {
		/* Clear label items */
		while (this.labelElement.firstChild) {
			this.labelElement.removeChild(this.labelElement.firstChild);
		}

		/* Add buton tags for label items */
		for (const label of this.labels) {
			this.labelElement.appendChild(Model.createLabelItem(label))
		}
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

let labelDivEl = getEl('label_list');
let modelDB = new Model([], {}, labelDivEl);

let net;
let classifier = new knnClassifier.KNNClassifier();
const webcamElement = document.getElementById('webcam');


async function app() {
	// Load the model.
	net = await mobilenet.load();
	console.log('Successfully loaded mobilenet');

	const webcam = await tf.data.webcam(webcamElement);
	console.log('Successfully loaded video');

	getEl('preloader').classList.add('hide');

	let saved_data = await getFromLocalStorage();
	modelDB.load(saved_data);

	modelDB.renderLabels();

	const addExample = async (classId) => {
		const img = await webcam.capture();
		const activation = net.infer(img, 'conv_preds');

		classifier.addExample(activation, classId);
		// console.log('count:', classifier.getClassExampleCount()[classId]);
		modelDB.updateLabel(classId, classifier.getClassExampleCount()[classId]);

		let modelData = await getModelData();
		modelDB.update(modelDB.labels, modelData);
		saveToLocalStorage(modelDB);
		// Dispose the tensor to release the memory.
		img.dispose();
	};

	// delete all data saved in local storage
	getEl('clearsaveddata').addEventListener('click', (event) => clearSavedData(event));

	getEl('uploadModel').addEventListener('change', handleFileSelect, false);
	
	

	getEl('downloadModel').addEventListener('click', event => {
		downloadJSON(JSON.stringify(modelDB));
	})

	// label button click listener
	getEl('label_list').addEventListener('click', async (event) => {
		let id = event.target.getAttribute('data-name');
		if (event.target.classList.contains('btn')) {
			addExample(event.target.id);
		} else if (event.target.classList.contains('close')) {
			modelDB.deleteLabel(id);
			let modelData = await getModelData();
			modelDB.update(modelDB.labels, modelData)
			saveToLocalStorage(modelDB);
		}
	});

	getEl('add_label_form').addEventListener('submit', (event) => {
		event.preventDefault();
		let label_name = getEl('label_name').value;

		if (label_name) {
			modelDB.addLabel(label_name);
			getEl('add_label_form').reset();
			saveToLocalStorage(modelDB);
			// getEl('label_name').value = '';
			// getEl('label_name').classList.remove('valid');
		} else {
			toast('Label name cannot be empty', 'error');
		}
	});


	// prediction elements
	let predictions = document.getElementById('console');
	let labelEl = document.getElementById('label');
	let confidenceEl = document.getElementById('confidence');

	let confusionEl = document.getElementById('confusion_matrix');

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
					displayPredictions(result, predictions, labelEl, confidenceEl);
				}
				img.dispose();
			} else {
				predictions.setAttribute('style', 'display: none;')
			}

			await tf.nextFrame();
		}
	} catch (err) {
		console.log(err);
	}

}

function displayPredictions(result, predictions, labelEl, confidenceEl) {
	let confidence = result.confidences[result.label];
	// confidence color
	let btn_color = getBtnColor(confidence);
	predictions.setAttribute('style', 'display: block;');
	labelEl.innerHTML = result.label;
	confidenceEl.innerHTML = (confidence * 100).toFixed(0) + '%';
	confidenceEl.setAttribute('style', `color: ${btn_color};`);
}

function getBtnColor(confidence) {

	if (typeof confidence === 'number') {
		if (confidence > 0.70) {
			btn_color = '#8bc34a';
		}
		else if (confidence >= 0.5 && confidence <= 0.70) {
			btn_color = 'orange';
		}
		else if (confidence < 0.50) {
			btn_color = 'red';
		}
	}

	// console.log(btn_color);
	return btn_color;
}

function handleFileSelect(event) {
	const reader = new FileReader();
	reader.onload = handleFileLoad;
	reader.readAsText(event.target.files[0]);
}

function handleFileLoad(event) {
	let data = JSON.parse(event.target.result);
	modelDB.load(data);
	// console.log();
}

async function getModelData() {
	const dataset = classifier.getClassifierDataset();
	const datasetObj = await toDatasetObject(dataset);
	return datasetObj;
}
function downloadJSON(data) {
	let filename = 'classifier.json';
	let blob = new Blob([data], { type: 'text/json' });
	if (window.navigator.msSaveOrOpenBlob) {
		window.navigator.msSaveBlob(blob, filename);
	}
	else {
		let elem = window.document.createElement('a');
		elem.href = window.URL.createObjectURL(blob);
		elem.download = filename;
		document.body.appendChild(elem);
		elem.click();
		document.body.removeChild(elem);
	}
}

async function clearAll(classifier) {
	classifier.clearAllClasses();
}

async function clearSavedData(event) {
	event.preventDefault();
	const jsonStr = JSON.stringify({});
	localStorage.setItem(storageKey, jsonStr);

	modelDB.load();
	classifier.clearAllClasses();
	toast('Cleared all data from local storage', 'success');
}

async function saveToLocalStorage(dataToSave) {
	const jsonStr = JSON.stringify(dataToSave);
	let res = localStorage.setItem(storageKey, jsonStr);
}

async function getFromLocalStorage() {
	let saved_data = localStorage.getItem(storageKey);
	saved_data = JSON.parse(saved_data);

	return saved_data;
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
