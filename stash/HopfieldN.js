// The code written in BSD/KNF indent style
"use strict";

class HopfieldNetwork {
	constructor(windowSystemRoot, rootWindow) {
		this.SysRoot = windowSystemRoot;
		this.rootWindow = rootWindow;
		this.rootWindow.style.overflow = "hidden";
		this.rootWindow.rootInstance = this;
		this.rootWindowStyle = window.getComputedStyle(this.rootWindow);

		this.symmetrical = false;
		this.trainButton = null;
		this.startButton = null;
		this.switchSymmetricalButton = null;
		this.timeCounter = null;
		this.timeCounterLabel = null;
		this.cellsRow = null;
		this.cellsRowLabel = null;
		this.cellsCol = null;
		this.cellsColLabel = null;

		this.trainedPatterns = null;

		this.timeSimulation = 0;
		this.fieldSize = {rows: 5, cols: 5};
		this.field = null;
		this.nodes = null;
		this.weight = null;
		this.running = false;

		this.fieldCellSize = 32;
		this.fieldCellOffset = {top: 120, left: 70};
		// Initialize
		this.init();
	}

	// ----- Initialize -----
	init()
	{
		// Create UI parts
		this.prepareTools();

		// Initialize
		this.initField();
		this.initNetwork();
	}

	prepareTools()
	{
		this.trainButton = document.createElement("div");
		this.trainButton.className = "HopfieldNetworkButton";
		this.trainButton.rootInstance = this;
		this.trainButton.innerHTML = "train";
		this.trainButton.id = "HopfieldNetworkTrainButton";
		this.trainButton.addEventListener("mousedown", function (e) { e.preventDefault(); e.currentTarget.rootInstance.trainCurrentPattern(); }, false);
		this.trainButton.addEventListener("touchstart", function (e) { e.preventDefault(); e.currentTarget.rootInstance.trainCurrentPattern(); }, false);
		this.rootWindow.appendChild(this.trainButton);

		this.startButton = document.createElement("div");
		this.startButton.className = "HopfieldNetworkButton";
		this.startButton.rootInstance = this;
		this.startButton.innerHTML = "run";
		this.startButton.id = "HopfieldNetworkStartButton";
		this.startButton.addEventListener("mousedown", function (e) { e.preventDefault(); e.currentTarget.rootInstance.run(e); }, false);
		this.startButton.addEventListener("touchstart", function (e) { e.preventDefault(); e.currentTarget.rootInstance.run(e); }, false);
		this.rootWindow.appendChild(this.startButton);

		this.switchSymmetricalButton = document.createElement("div");
		this.switchSymmetricalButton.className = "HopfieldNetworkButton";
		this.switchSymmetricalButton.rootInstance = this;
		this.switchSymmetricalButton.innerHTML = "symmetrical";
		this.switchSymmetricalButton.id = "HopfieldNetworkSwitchSymmetricalButton";
		this.switchSymmetricalButton.addEventListener("mousedown", function (e) { e.preventDefault(); e.currentTarget.rootInstance.switchSymmetrical(); }, false);
		this.startButton.addEventListener("touchstart", function (e) { e.preventDefault(); e.currentTarget.rootInstance.switchSymmetrical(); }, false);
		this.rootWindow.appendChild(this.switchSymmetricalButton);

		this.timeCounter = document.createElement("div");
		this.timeCounter.innerHTML = "0";
		this.timeCounter.id = "HopfieldNetworkTimeCounter";
		this.rootWindow.appendChild(this.timeCounter);
		this.timeCounter.addEventListener("mousedown", (e) => console.log(this), false);

		this.timeCounterLabel = document.createElement("div");
		this.timeCounterLabel.innerHTML = "time";
		this.timeCounterLabel.id = "HopfieldNetworkTimeCounterLabel";
		this.rootWindow.appendChild(this.timeCounterLabel);

		this.cellsRow = document.createElement("input");
		this.cellsRow.rootInstance = this;
		this.cellsRow.type = "text";
		this.cellsRow.value = this.fieldSize.rows;
		this.cellsRow.id = "HopfieldNetworkCellsRow";
		this.cellsRow.addEventListener("change", function (e) { e.currentTarget.rootInstance.reinit(); }, false);
		this.rootWindow.appendChild(this.cellsRow);

		this.cellsCol = document.createElement("input");
		this.cellsCol.rootInstance = this;
		this.cellsCol.type = "text";
		this.cellsCol.value = this.fieldSize.cols;
		this.cellsCol.id = "HopfieldNetworkCellsCol";
		this.cellsCol.addEventListener("change", function (e) { e.currentTarget.rootInstance.reinit(); }, false);
		this.rootWindow.appendChild(this.cellsCol);

		this.timeRowLabel = document.createElement("div");
		this.timeRowLabel.innerHTML = "Rows";
		this.timeRowLabel.id = "HopfieldNetworkCellsRowLabel";
		this.rootWindow.appendChild(this.timeRowLabel);

		this.timeColLabel = document.createElement("div");
		this.timeColLabel.innerHTML = "x Cols";
		this.timeColLabel.id = "HopfieldNetworkCellsColLabel";
		this.rootWindow.appendChild(this.timeColLabel);

		this.trainedPatterns = document.createElement("div");
		this.trainedPatterns.id = "HopfieldNetworkTrainedPattern";
		this.trainedPatterns.style.width = "1px";
		this.trainedPatterns.style.height = "1px";
		this.rootWindow.appendChild(this.trainedPatterns);

		// Reset symmetrical button
		this.switchSymmetrical(this.symmetrical);
	}

	initField()
	{
		this.field = new Array2D(this.fieldSize.cols, this.fieldSize.rows);
		let size = this.fieldCellSize;
		for (let y = 0; y < this.field.height; y++) {
			for (let x = 0; x < this.field.width; x++) {
				let check = document.createElement("input");
				check.type = "checkbox";
				check.className = "HopfieldNetworkPixel";
				check.style.top = (this.fieldCellOffset.top + y * (size + 2)) + "px";
				check.style.left = (this.fieldCellOffset.left + x * (size + 2)) + "px";
				check.style.width = size + "px";
				check.style.height = size + "px";
				this.field.set(x, y, check);
				this.rootWindow.appendChild(this.field.get(x, y));
			}
		}
	}

	initNetwork()
	{
		// node
		this.nodes = new Array(this.field.length);
		for (let n = 0; n < this.nodes.length; n++) {
			this.nodes[n] = {output: 0, bias: 0};
		}
		// weight
		this.weight = new Array2D(this.nodes.length, this.nodes.length);
		for (let n = 0; n < this.weight.length; n++) {
			this.weight[n] = 0;
		}
	}

	reinit()
	{
		this.fieldSize.rows = this.cellsRow.value;
		if (this.fieldSize.rows < 1) {
			this.fieldSize.rows = 1;
		}
		this.fieldSize.cols = this.cellsCol.value;
		if (this.fieldSize.cols < 1) {
			this.fieldSize.cols = 1;
		}
		// Delete cells
		for (let n = 0; n < this.field.length; n++) {
			this.field[n].remove();
		}
		// Flush trainedPatterns
		while (this.trainedPatterns.children.length > 0) {
			this.trainedPatterns.children[0].remove();
		}
		this.trainedPatterns.style.width = "1px";
		this.trainedPatterns.style.height = "1px";
		// Initialize
		this.initField();
		this.initNetwork();
	}




	// ----- SIMULATION -----
	start()
	{
	}




	// ----- FIELD -----
	setField()
	{
		for (let n = 0; n < this.nodes.length; n++) {
			this.field[n].checked = this.nodes[n].output > 0 ? true : false;
		}
	}




	// ----- NETWORKS -----
	bool2int(value) {
		if (this.symmetrical) {
			return value ? 1 : -1;
		} else {
			return value ? 1 : 0;
		}
	}

	train(field)
	{
		let nodeNum = this.nodes.length;
		if (field == null || field.length != nodeNum) {
			console.error("HopfieldNetwork.train(): incorrect argument");
			return;
		}
		for (let i = 0; i < nodeNum; i++) {
			for (let j = 0; j < nodeNum; j++) {
				if (i != j) {
					let tmp = this.weight.get(j, i) +
					    this.bool2int(field[i]) * this.bool2int(field[j]);
					this.weight.set(j, i, tmp);
				}
			}
		}
	}

	trainCurrentPattern()
	{
		// get field input
		let nodeNum = this.nodes.length;
		let current = new Array2D(this.field.width, this.field.height);
		for (let n = 0; n < this.field.length; n++) {
			current[n] = this.field[n].checked;
		}
		this.train(current);
		// Add trained pattern to the list
		this.addTrainedPattern(current);
	}

	retrainTrainedPatterns()
	{
		// Check
		if (this.trainedPatterns.children.length == 0 ||
		    this.nodes.length != this.trainedPatterns.children[0].pattern.length) {
			return;
		}
		// Reset weights
		for (let n = 0; n < this.weight.length; n++) {
			this.weight[n] = 0;
		}
		// Learn all patterns stored in trainedPatterns
		for (let pat = 0; pat < this.trainedPatterns.children.length; pat++) {
			let pattern = this.trainedPatterns.children[pat].pattern;
			this.train(pattern);
		}
	}

	addTrainedPattern(pattern)
	{
		let cellSize = 8;
		var newPattern = document.createElement("div");
		newPattern.rootInstance = this;
		newPattern.style.position = "absolute";
		newPattern.style.top = 10 + this.trainedPatterns.children.length * ((cellSize + 1) * this.field.height + 10) + "px";
		newPattern.style.right = (cellSize + 1) * this.field.width - 1 + 10 + "px";
		newPattern.pattern = new Array2D(this.field.width, this.field.height);
		for (let i = 0; i < this.field.length; i++) {
			newPattern.pattern[i] = pattern[i] > 0 ? true : false;
		}
		for (let m = 0; m < this.field.height; m++) {
			for (let n = 0; n < this.field.width; n++) {
				var cell = document.createElement("div");
				cell.style.position = "absolute";
				cell.style.top = m * (cellSize + 1) + "px";
				cell.style.left = n * (cellSize + 1) + "px";
				cell.style.width = cellSize + "px";
				cell.style.height = cellSize + "px";
				cell.style.outline = "1px solid rgb(255,255,255)";
				cell.style.backgroundColor = pattern.get(n, m) > 0 ? "rgb(255,255,255)" : "rgb(0,0,0)";
				newPattern.appendChild(cell);
			}
		}
		this.trainedPatterns.appendChild(newPattern);
		let setPattern = function (event) {
			let root = event.currentTarget.rootInstance;
			for (let n = 0; n < root.field.length; n++) {
				root.field[n].checked = event.currentTarget.pattern[n];
			}
		};
		newPattern.addEventListener("click", setPattern, false);
		newPattern.addEventListener("touchstart", setPattern, false);

		// Set trainedPatterns' size
		let currentWidth = parseInt(this.trainedPatterns.style.width, 10);
		let newWidth = 20 + (cellSize + 1) * this.field.width;
		if (newWidth > currentWidth) {
			this.trainedPatterns.style.width = newWidth + "px";
		}
		this.trainedPatterns.style.height = 10 + this.trainedPatterns.children.length * ((cellSize + 1) * this.field.height + 10) + "px";
	}

	run()
	{
		if (!this.running) {
			this.running = true;
			let root = this;
			let count = 100;
			this.loopTimer = setInterval(function () {
				root.step();
				root.showEnergy();
				count--;
				if (count <= 0) {
					clearInterval(root.loopTimer);
					root.running = false;
				}
			}, 20);
		}
	}

	step()
	{
		// Get current field state
		for (let k = 0; k < this.field.length; k++) {
			this.nodes[k].output = this.field[k].checked ? 1 : 0;
		}
		// Update hopfield network
		let nodeNum = this.nodes.length;
		let i = Math.floor(Math.random() * nodeNum);
		for (let k = 0; k < this.field.length; k++) {
			this.field[k].style.outlineColor = "rgb(255,255,255)";
		}
		this.field[i].style.outlineColor = "rgb(255,0,0)";
		let sum = this.nodes[i].bias;
		for (let j = 0; j < nodeNum; j++) {
			sum += this.weight.get(j, i) * this.nodes[j].output;
		}
		let old = this.nodes[i].output;
		if (sum > 0) {
			this.nodes[i].output = 1;
			this.field[i].checked = true;
		} else {
			this.nodes[i].output = 0;
			this.field[i].checked = false;
		}
		this.timeSimulation++;
		this.timeCounter.innerHTML = this.timeSimulation;
	}

	showEnergy()
	{
		let E = 0;
		for (let i = 0; i < this.field.length; i++) {
			for (let j = 0; j < this.field.length; j++) {
				E += -this.weight.get(j, i) * this.nodes[i].output * this.nodes[j].output;
			}
		}
		console.log("E = " + E);
	}

	switchSymmetrical(value = null)
	{
		if (typeof value === "boolean") {
			this.symmetrical = value;
		} else {
			this.symmetrical = !this.symmetrical;
		}
		this.switchSymmetricalButton.innerHTML = this.symmetrical ? "symmetrical" : "asymmetrical";
		// Re-train all patterns in current mode
		this.retrainTrainedPatterns()
	}
}

