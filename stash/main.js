window.addEventListener("load", initSystem, false);

var SystemRoot;
var HopfieldNetworkWindow;
var HopfieldNetworkApplication;

function
initSystem()
{
	SystemRoot = new ECMASystem(document.body);

	HopfieldNetworkWindow = SystemRoot.createWindow({id: "HopfieldNetwork", noCloseButton: null});
	HopfieldNetworkWindow.ECMASystemWindowFixed = true;
	HopfieldNetworkWindow.style.position = "absolute";
	HopfieldNetworkWindow.style.top = "0px";
	HopfieldNetworkWindow.style.left = "0px";
	HopfieldNetworkWindow.style.width = "100%";
	HopfieldNetworkWindow.style.height = "100%";
	HopfieldNetworkWindow.style.padding = "0";
	HopfieldNetworkWindow.style.outline = "0";
	HopfieldNetworkWindow.style.border = "0";
	HopfieldNetworkWindow.style.backgroundColor = "rgba(20, 20, 20, 0.5)";
	document.body.appendChild(HopfieldNetworkWindow);
	SystemRoot.windowScroller.style.display = "none";

	HopfieldNetworkApplication = new HopfieldNetwork(SystemRoot, HopfieldNetworkWindow);
}

