const storageKey = "knnClassifier";
let foundLabelData = {
	date: '',
	duration: 0,
	label: ''
};

let ignoreLabelName = 'default';
const sheetId = '1a3N1uuV_BeDkNWRLYFrhHrt7T6IQs8GcjLUosdgLDxs';

class Models {
	constructor(element) {
		this.modelElement = element;
		this.current = '';
		this.models = [];
	}

	/* makes a option tag */
	static createModelItem(model, selected = false) {
		const optionItem = document.createElement('option');
		if (model) {
			optionItem.setAttribute('value', model.name);
			optionItem.setAttribute('onclick', `modelBinding.loadModel('${model.name}')`);
			optionItem.textContent = `${model.name}`;

			if (selected) {
				console.log('model name', model.name);
				optionItem.setAttribute('class', 'teal');
				optionItem.setAttribute('selected', 'selected');
			}
		} else {
			console.log('no model', model);
			optionItem.setAttribute('value', 'No saved models');
			optionItem.setAttribute('disabled', 'disabled');
			optionItem.setAttribute('selected', 'selected');
			optionItem.textContent = `No saved models`;
		}
		return optionItem;
	}

	add(modelName, modelLabels, modelData) {
		let [modelExists] = this.models.map(model => {
			return (model.name === modelName) ? true : false;
		});

		let model = {
			name: modelName,
			labels: modelLabels,
			model: modelData
		}

		if (modelExists) {
			console.log(name, 'model exists');
			return this;
		} else {
			this.models.push(model);
			this.current = model.name;
			this.render();
			return this;
		}
	}

	/* Load saved data */
	load(data) {

		if (data && data.current) {
			this.current = data.current;
			this.models = data.models;

			this.render();
			return this;
		} else {
			this.render();
			console.log('no saved data');
		}

	}

	/* create saved data */
	get() {
		let data = {
			current: this.current,
			models: this.models
		}

		if (this.models.length > 0) {
			return data;
		} else {
			return {};
		}

	}

	loadModel(modelName) {
		this.current = modelName;
		let [model] = this.models.filter(m => {
			return m.name === modelName;
		})
		console.log('loaded model', modelName, model.labels.length);
		return model;
	}

	getCurrentModel() {
		let [model] = this.models.filter(m => {
			return m.name === this.current;
		})

		return model;
	}

	updateModel(modelName, modelLabels, modelData) {
		let [model] = this.models.filter(m => {
			if (m.name === modelName) {
				m.labels = modelLabels;
				m.model = modelData;
				return m;
			}
		})
		console.log('updated:', model);
		return this;
	}

	updateCurrentModelLabels(modelName, modelLabels) {
		let [model] = this.models.filter(m => {
			if (m.name === modelName) {
				m.labels = modelLabels;
				return m;
			}
		})

		console.log(model);
		return this;
	}

	delete(modelName) {
		this.models = this.models.filter(model => {
			return model.name !== modelName;
		})
		this.render();
		return this;
	}

	render() {
		/* Clear model items */
		while (this.modelElement.firstChild) {
			this.modelElement.removeChild(this.modelElement.firstChild);
		}

		/* Add option tags for model items */
		if (this.models.length > 0) {
			for (const model of this.models) {
				if (model.name === this.current) {
					this.modelElement.appendChild(Models.createModelItem(model, true))
				} else {
					this.modelElement.appendChild(Models.createModelItem(model))
				}
			}
		} else {
			this.modelElement.appendChild(Models.createModelItem())
		}
		let elems = document.querySelectorAll('select');
		let instances = M.FormSelect.init(elems, {});
	}
}

class Labels {
	constructor(element, modelElement) {
		this.labelElement = element;
		this.modelElement = modelElement;
		this.list = [];
	}

	/* makes a button tag */
	static createLabelItem(label) {
		const labelBtn = document.createElement('button');
		labelBtn.setAttribute('id', label.name);
		labelBtn.setAttribute('class', 'btn btn-small btn-label waves-effect waves-light grey darken-2');
		labelBtn.setAttribute('style', 'display: inline-flex;');
		// labelBtn.setAttribute('onclick', `labelBinding.count('${label.name}')`);
		labelBtn.textContent = `${label.name} (${label.count})`;

		const labelClose = document.createElement('i');
		labelClose.setAttribute('class', 'close material-icons');
		labelClose.setAttribute('data-name', label.name);
		labelClose.setAttribute('data-count', label.count);
		labelClose.setAttribute('style', 'padding: 0 0 0 10;');
		// labelClose.setAttribute('onclick', `labelBinding.delete('${label.name}')`);
		labelClose.textContent = 'close';

		labelBtn.appendChild(labelClose);

		return labelBtn;
	}

	add(name, count, id) {
		let [labelExists] = this.list.map(label => {
			return (label.name === name) ? true : false;
		});

		let label = {
			name: name,
			count: count,
			id: id
		}

		if (labelExists) {
			console.log(name, 'label exists');
			return this;
		} else {
			this.list.push(label);
			this.render();

			let model_name = this.modelElement.current;
			console.log('model Name:', model_name);
			// this.modelElement.updateModel(model_name, this.list);
			return this;
		}
	}

	render() {
		/* Clear label items */
		while (this.labelElement.firstChild) {
			this.labelElement.removeChild(this.labelElement.firstChild);
		}

		/* Add buton tags for label items */
		for (const label of this.list) {
			this.labelElement.appendChild(Labels.createLabelItem(label))
		}
	}

	delete(labelName) {
		this.list = this.list.filter(label => {
			return label.name !== labelName;
		})
		this.render();
		// classifier.clearClass(labelName);
		return this;
	}

	/* Increase label count */
	count(labelName) {
		let [label] = this.list.filter(label => {
			if (label.name === labelName) {
				label.count++;
			}
		});

		this.render();
		return this;
	}

	load(labelList) {
		this.list = labelList;
		this.render();
		return this;
	}

}

const makeHttpCall = async (options) => {
	return new Promise((resolve) => {
		var req = https.request(options, res => {
			res.setEncoding('utf8');
			var returnData = "";
			res.on('data', chunk => {
				returnData = returnData + chunk;
			});
			res.on('end', () => {
				let results = JSON.parse(returnData);
				// console.log(`results: ${JSON.stringify(results)}`);
				resolve(results);
			});
		});
		if (options.method == 'POST' || options.method == 'PATCH') {
			req.write(JSON.stringify(options.body));
		}
		req.end();
	})
}
// Dataset operations
async function toDatasetObject(dataset) {
	const result = await Promise.all(
		Object.entries(dataset).map(async ([classId, value], index) => {
			const data = await value.data();
			return {
				classId: classId,
				data: Array.from(data),
				shape: value.shape
			};
		})
	);
	return result;
};

function fromDatasetObject(datasetObject) {
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

function fromStorage(key) {
	let data = localStorage.getItem(key);
	let json = JSON.parse(data);
	console.log('size:', memorySizeOf(json));
	return json;
}

async function toStorage(dataToSave) {
	console.log('save size:', memorySizeOf(dataToSave));
	const jsonStr = JSON.stringify(dataToSave);
	localStorage.setItem(storageKey, jsonStr);
}

function confidenceColor(confidence) {
	let btn_color = 'blue-grey';

	if (typeof confidence === 'number') {
		if (confidence > 0.70) {
			btn_color = 'teal';
		} else if (confidence > 0.5 && confidence < 0.70) {
			btn_color = 'deep orange';
		} else if (confidence < 0.50) {
			btn_color = 'red';
		}
	}

	return btn_color;
}

function getEl(elementId) {
	return document.getElementById(elementId);
}

function addNewLabel(event) {
	event.preventDefault();
	let label_name = getEl('label_name').value;
	getEl('add_label_form').reset();
	labelBinding.add(label_name, 0, '');
	console.log(label_name);
	toStorage(modelBinding.get());
}

async function saveNewModel(event) {
	event.preventDefault();
	const dataset = classifier.getClassifierDataset();

	let model_name = getEl('model_name').value;
	let model_labels = labelBinding.list;
	const model_data = await toDatasetObject(dataset);

	modelBinding.add(model_name, model_labels, model_data);
	getEl('model_name').value = '';
	toStorage(modelBinding.get());
}

async function updateModel(label_name) {
	const dataset = classifier.getClassifierDataset();
	const datasetObj = await toDatasetObject(dataset);

	let model_name = modelBinding.current;
	labelBinding.count(label_name);
	modelBinding.updateModel(model_name, labelBinding.list, datasetObj);

	toStorage(modelBinding.get());
}

async function deleteModel() {
	classifier.clearAllClasses();

	labelBinding.load([]);
	modelBinding.delete(modelBinding.current);


	let models = modelBinding.get().models;

	if (models && models.length > 0) {
		modelBinding.current = models[0].model.name;
		const dataset = fromDatasetObject(models[0].model);
		classifier.setClassifierDataset(dataset);
		labelBinding.load(models[0].labels);
		console.log('deleted model');
	}
	toStorage(modelBinding.get());
}

function millisToDuration(millis, type) {
	let minutes = Math.floor(millis / 60000);
	let seconds = ((millis % 60000) / 1000).toFixed(0);
	let response = '';

	if (type === 'text') {
		if (minutes > 0) {
			let min = minutes > 1 ? 'minutes' : 'minute';
			response += `${minutes} ${min}`
		}

		if (seconds > 0) {
			let sec = seconds > 1 ? 'seconds' : 'second';
			response += ` ${seconds} ${sec}`
		}
	} else {
		if (minutes > 0) {
			response += `${minutes} min `
		}

		if (seconds > 0) {
			response += `${seconds} sec`
		}
	}

	// console.log('duration', response);
	return response;
}

function getDate(timestamp) {
	let d = new Date(timestamp);
	return d.getMonth() + 1 + "/" + d.getDate() + "/" + d.getFullYear() + " " + d.toLocaleTimeString();
}
// log data to google sheets through stdlib
async function logData(data) {
	// https://tinkr.api.stdlib.com/sheets@dev/add/?date=today%20date&duration=some%20duration

	let save_data = {
		fieldsets: [{
			date: getDate(data.date),
			duration: data.duration,
			readable: millisToDuration(data.duration),
			label: data.label
		}],
		range: 'log!A1:D',
		spreadsheetId: sheetId
	}

	if (sheetId) {
		axios({
			url: 'https://tinkr.api.stdlib.com/sheets@dev/add/',
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			data: save_data
		})
			.then(result => {
				console.log('result', result);
				return result;
			})
	} else {
		console.log('sheetId is not specified. No data logged.')
	}

	// let options = {
	// 	host: 'tinkr.api.stdlib.com',
	// 	path: '/sheets@dev/add/',
	// 	method: 'POST',
	// 	headers: {
	// 		'content-type': 'application/json'
	// 	},
	// 	body: {
	// 		date: data.date,
	// 		duration: data.duration,
	// 		cat: data.cat,
	// 		range: 'log!A1:C',
	// 		spreadsheetId: '1a3N1uuV_BeDkNWRLYFrhHrt7T6IQs8GcjLUosdgLDxs'
	// 	}
	// }

	// console.log('log data:', options.body);
	// let results = await makeHttpCall(options);


}

// track label
function trackLabel(labelName) {
	if (labelName === foundLabelData.label) {
		foundLabelData.duration = Date.now() - foundLabelData.date;
	} else {
		// console.log(labelName, foundLabelData.label);
		if (foundLabelData.label !== ignoreLabelName && foundLabelData.duration > (10 * 1000)) {
			console.log(labelName);
			logData(foundLabelData);
		}
		foundLabelData.date = Date.now();
		foundLabelData.duration = 0;
		foundLabelData.label = labelName;
	}
	// console.log(foundLabelData);
}

function memorySizeOf(obj) {
	var bytes = 0;

	function sizeOf(obj) {
		if (obj !== null && obj !== undefined) {
			switch (typeof obj) {
				case 'number':
					bytes += 8;
					break;
				case 'string':
					bytes += obj.length * 2;
					break;
				case 'boolean':
					bytes += 4;
					break;
				case 'object':
					var objClass = Object.prototype.toString.call(obj).slice(8, -1);
					if (objClass === 'Object' || objClass === 'Array') {
						for (var key in obj) {
							if (!obj.hasOwnProperty(key)) continue;
							sizeOf(obj[key]);
						}
					} else bytes += obj.toString().length * 2;
					break;
			}
		}
		return bytes;
	};

	function formatByteSize(bytes) {
		if (bytes < 1024) return bytes + " bytes";
		else if (bytes < 1048576) return (bytes / 1024).toFixed(0) + " KB";
		else if (bytes < 1073741824) return (bytes / 1048576).toFixed(0) + " MB";
		else return (bytes / 1073741824).toFixed(0) + " GB";
	};

	return formatByteSize(sizeOf(obj));
};

let classifier = new knnClassifier.KNNClassifier();
// const webcamElement = document.getElementById('webcam');

let canvas = document.getElementById("cnv");
let ctx = canvas.getContext("2d");


var videoImg = document.getElementById("vid-canvas");

const modelList = document.getElementById('model_list');
const modelBinding = new Models(modelList);

const labelList = document.getElementById('label_list');
const labelBinding = new Labels(labelList, modelBinding);

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
					resolve(webcamElement);
					// webcamElement.addEventListener('model_list', () => resolve(), false);
				},
				error => reject());
		} else {
			reject();
		}
	});
}

function start() {
	let data = fromStorage(storageKey);
	console.log('saved data:', data);
	if (data && data.current && data.models.length > 0) {
		modelBinding.load(data);
		// setupWebcam();
		let model = modelBinding.getCurrentModel();
		// console.log('model:', model);

		const dataset = fromDatasetObject(model.model);
		classifier.setClassifierDataset(dataset);
		labelBinding.load(model.labels);
	} else {
		console.log('no data to load');
		modelBinding.load({});
	}

	// add new label
	getEl('new_model').addEventListener('click', (e) => {
		console.log('loading new model!');
		// classifier.setClassifierDataset({});
		classifier = new knnClassifier.KNNClassifier();
	});

	// add new label
	getEl('add_label_form').addEventListener('submit', (e) => addNewLabel(e));

	// delete label
	// getEl('add_label_form').addEventListener('submit', (e) => addNewLabel(e));

	// save new model
	getEl('saveModel').addEventListener('click', (event) => saveNewModel(event));

	// delete current model
	getEl('deleteModel').addEventListener('click', (event) => deleteModel(event));

	// load saved model
	getEl('model_list').addEventListener('change', async function (event) {
		let model = modelBinding.loadModel(event.target.value);
		labelBinding.load(modelBinding.getCurrentModel().labels);

		// get model
		const dataset = fromDatasetObject(model.model);
		if (dataset) {
			classifier.setClassifierDataset(dataset);
		} else {
			classifier = new knnClassifier.KNNClassifier();
		}

		console.log(classifier.getNumClasses(), model);
	});

	// delete call saved data
	getEl('deleteData').addEventListener('click', async (event) => {
		toStorage({});
	});
}
let net;

async function update() {
	ctx.fillText('hello', 20, 20);
	ctx.drawImage(video, 0, 0, 256, 256);
	
	if (classifier.getNumClasses() > 0) {
		// const img = await webcam.capture();
		const img = grabScreenshot();
		const activation = net.infer(img, 'conv_preds');
		const result = await classifier.predictClass(activation);
		let predictionTxt = '';
		// console.log(classifier.getNumClasses());
		if (result.label !== undefined) {

			let confidence = result.confidences[result.label];

			// confidence color
			let btn_color = confidenceColor(confidence);

			predictionTxt = `
				<span id="label">${result.label}</span>
				<span class="${btn_color}" id="confidence">${confidence.toFixed(2)}</span>`

			trackLabel(result.label);
		}

		document.getElementById('console').innerHTML = predictionTxt;
		// Dispose the tensor to release the memory.
		// img.dispose();
	}

	// await tf.nextFrame();

	requestAnimationFrame(update); // wait for the browser to be ready to present another animation frame.       
}



let video = document.getElementById("webcam");
// var video = document.querySelector("#videoElement");
window.onload =  (event) => {
	console.log('page is fully loaded');
	if (navigator.mediaDevices.getUserMedia) {
		navigator.mediaDevices.getUserMedia({ video: true })
			.then(function (stream) {
				video.srcObject = stream;
				app();
			})
			.catch(function (err0r) {
				console.log("Something went wrong!");
			});
	}

	video.addEventListener('loadeddata', async function () {
		// video.play();  // start playing
		net = await mobilenet.load();
		console.log('loaded')
		update(); //Start rendering
	});
};

function grabScreenshot() {
	// ctx.drawImage(video, 0, 0, 300, 300);
	let img = new Image();
	img.src = canvas.toDataURL("image/png");
	img.width = 240;
	img.height = 240;
	return img;
}
// window.onload = () => {
// 	app();
// }
// navigator.getUserMedia({ video: true },
// 	stream => {
// 		video.srcObject = stream;
// 	}, error => {
// 		console.log('error:', error);
// 	});




async function app() {
	start();
	

	// video.src = "http://techslides.com/demos/sample-videos/small.mp4";



	// const cam = await setupWebcam();
	// const webcam = await tf.data.webcam(cam);
	// console.log('webcam loaded', webcam);
	// const webcam = await setupWebcam();

	const addExample = async (labelName) => {
		// const img = await webcam.capture();
		const img = grabScreenshot();
		// console.log(img);
		const activation = net.infer(img, 'conv_preds');

		classifier.addExample(activation, labelName);

		console.log('adding example', labelName);
		// Update model
		updateModel(labelName);

		// Dispose the tensor to release the memory.
		// img.dispose();
	}

	// label button click listener
	getEl('label_list').addEventListener('click', (event) => {
		try {
			let label_name = '';
			if (event.target.classList.contains('btn')) {
				label_name = event.target.id;
				addExample(label_name);
			} else if (event.target.classList.contains('close')) {
				label_name = event.target.getAttribute('data-name');
				let label_count = classifier.getClassExampleCount()[label_name];

				labelBinding.delete(label_name);

				if (label_count > 0) {
					classifier.clearClass(label_name);
				}
				updateModel(label_name);
			}
		} catch (error) {
			console.log('error:', error);
		}

	});

	// try {
	// 	while (true) {
	// 		// if (classifier.getNumClasses() > 0) {
	// 		// 	// const img = await webcam.capture();
	// 		// 	const img = grabScreenshot();
	// 		// 	const activation = net.infer(img, 'conv_preds');
	// 		// 	const result = await classifier.predictClass(activation);
	// 		// 	let predictionTxt = '';
	// 		// 	// console.log(classifier.getNumClasses());
	// 		// 	if (result.label !== undefined) {

	// 		// 		let confidence = result.confidences[result.label];

	// 		// 		// confidence color
	// 		// 		let btn_color = confidenceColor(confidence);

	// 		// 		predictionTxt = `
	// 		// 			<span id="label">${result.label}</span>
	// 		// 			<span class="${btn_color}" id="confidence">${confidence.toFixed(2)}</span>`

	// 		// 		trackLabel(result.label);
	// 		// 	}

	// 		// 	document.getElementById('console').innerHTML = predictionTxt;
	// 		// 	// Dispose the tensor to release the memory.
	// 		// 	// img.dispose();
	// 		// }

	// 		// await tf.nextFrame();
	// 	}
	// } catch (err) {
	// 	console.log(err);
	// }


}

