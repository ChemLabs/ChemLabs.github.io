//VARIABLE INITIALIZATION
var database = firebase.database();
var elementsInMolecule = [];
var result = {};
var molStr = "";
var lastNum = "";
const molecularFormulaTextBox = document.getElementById("moleculeText");
var alertIncrement = 0;
const molDict = {
  "H2O": [962, "H2O", 0],
  "CH4": [297, "CH4", 0],
  "NH3": [222, "NH3", 0],
  "CO2": [280, "CO2", 0],
  "O3": [24823, "O3", 0]
}
const elementColorDict = {
  "H": "FFFFFF",
  "C": "C3C3C3",
  "N": "567BFF",
  "O": "FF302F",
  "F": "C4FF7B",
  "P": "FFB521",
  "S": "FDFF53",
  "Cl": "40FF43",
  "Se": "FEDB21",
  "Br": "D64E4D",
  "I": "C721C7",
  "At": "A77B70"
}
var elementsCurrentlyUsed = [];
var moleculesCurrentlyUsed = [];
const allowedElementSymbols = ["H", "C", "N", "O", "F", "P", "S", "Cl", "Se", "Br", "I", "At"]

//Gets the element symbol from element tile on periodic table
function getElement(elementDiv) {
  var chip = elementDiv.firstElementChild;
  var frontFace = chip.firstElementChild;
  var frontChildren = frontFace.children;
  var elementSymbol = frontChildren[1].innerHTML;

  moleculeCharacters = molStr.split("");

  lastNum = "";

  getLastNum(0);

  var lastElement = "";

  if (lastNum != 1) {
    for (i = 0; i < lastNum.length; i++) {
      var useless = moleculeCharacters.pop();
    }
  }

  var elementLength = elementSymbol.length;
  var previousElement = "";

  if (elementLength <= moleculeCharacters.length) {
    previousElement = moleculeCharacters.slice(-1 * elementLength).join("");

    if (previousElement == elementSymbol) {
      moleculeCharacters.push((parseInt(lastNum) + 1).toString());
      molStr = moleculeCharacters.join("");

      var molecularFormula = molecularFormulaTextBox.value;
      var updatedMolForm = "";
      if (lastNum != 1) {
        updatedMolForm = molecularFormula.substring(0, molecularFormula.length - lastNum.length);
      } else {
        updatedMolForm = molecularFormula;
      }

      var lastNumDigits = (parseInt(lastNum) + 1).toString().split("");

      lastNumDigits.forEach(item => updatedMolForm += String.fromCharCode(8320 + parseInt(item)));

      molecularFormulaTextBox.value = updatedMolForm;

    } else {
      molecularFormulaTextBox.value += elementSymbol;
      molStr += elementSymbol;
    }

  } else {
    molecularFormulaTextBox.value += elementSymbol;
    molStr += elementSymbol;
  }

  molecularFormulaTextBox.style.color = "#eee";

}

//Gets the last number of the text box
function getLastNum(characterNum) {
  var temp = characterNum + 1;
  moleculeCharacters = molStr.split("");
  if (moleculeCharacters.length > characterNum) {
    var lastChar = moleculeCharacters[moleculeCharacters.length - (characterNum + 1)];
    var lastCharAsInt = parseInt(lastChar);
    if (!isNaN(lastCharAsInt)) {
      var lastNumPlaceholder = lastNum
      lastNum = lastChar.concat(lastNumPlaceholder);
      getLastNum(temp);
    } else if (lastNum == "") {
      lastNum = "1";
    }
  }

}

//Clears text box
function clear() {
  molecularFormulaTextBox.value = "";
  molStr = "";
  lastNum = "0";
  elementsInMolecule = [];
}

//Gets 3d structure of molecule
function getStructure() {
  if (moleculesCurrentlyUsed.includes(molStr)) {
    swal ( "This Molecule has Already been Modeled", "", "error" );
  } else if (molStr == "") {
  } else {
    //Checks to make sure the molecule is valid
    var molecules = molStr.split(/(?=[A-Z0-9])/);
    var validMol = true;
    molecules.forEach (molChar => {
      if (isNaN(molChar) && !allowedElementSymbols.includes(molChar)) {
        validMol = false;
        return;
      }
    });

    if (!validMol) {
      swal ( "Invalid Molecular Formula" ,  "Check to makes sure this molecule includes no metals, metalloids, or noble gases. Also makes sure that you used proper capitalization for the molecule." ,  "error" );
    } else {

      if ($('#molViewer').length > 0) {
        removeElement("molViewerDiv");
        removeElement("moleculeForm");
      }

      getMolData();
    }
  }
}

//Checks if molecule exists in the database, if not, gets from pubchem
const getMolData = async () => {
  addLoading();
  window.scrollBy(0, 500);
  var snapshot = await database.ref("molDict/" + molStr).once("value");
  if (snapshot.exists()) {
    moleculesCurrentlyUsed.push(molStr);

    setUniqueMolecules(molStr.split(/(?=[A-Z0-9])/));

    var molData = await snapshot.val();
    var cid = String(molData["cid"])

    removeChemElements();
    elementsCurrentlyUsed.forEach(molId => addChemElement(molId));

    addMolViewer(cid, molStr);

    const srcCid = "https://embed.molview.org/v1/?mode=balls&cid=".concat(cid);
    document.getElementById("molViewer" + cid).src = srcCid;
    removeElement("loading");

    var moleculeInfo = "Molecule Formula: " + String(molData["molName"]);

    if (molData["charge"] != 0) {
      moleculeInfo += '\xa0\xa0\xa0\xa0\xa0\xa0\xa0' + "Charge: " + String(molData["charge"]);
    }

    document.getElementById("moleculeForm" + cid).innerHTML = moleculeInfo;

  } else {
    modelMolecule(molStr);
  }

}

//Finding model of molecule from pubchem database
const modelMolecule = async (formula) => {
  const response = await fetch("https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/formula/".concat(formula, "/JSON?AllowOtherElements=false&MaxRecords=1"));
  const responseJson = await response.json(); //extract JSON from the http response
  const listKey = responseJson["Waiting"]["ListKey"];

  var responseCid = await fetch("https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/listkey/" + listKey + "/cids/JSON");
  var responseCidJson = await responseCid.json();

  while (responseCidJson.hasOwnProperty("Waiting")) {
    responseCid = await fetch("https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/listkey/" + listKey + "/cids/JSON");
    responseCidJson = await responseCid.json();
    //document.getElementById("json").textContent = JSON.stringify(responseCidJson, undefined, 2);
  }

  if (responseCidJson.hasOwnProperty("Fault")) {
    removeElement("loading");
    swal ( "Invalid Molecular Formula" ,  "This molecule does not exist in the database. Check to make sure that the molecule is typed correctly" ,  "error" );
  } else if (responseCidJson.hasOwnProperty("IdentifierList")) {
    moleculesCurrentlyUsed.push(molStr);
    setUniqueMolecules(molStr.split(/(?=[A-Z0-9])/));

    removeElement("loading");

    removeChemElements();
    elementsCurrentlyUsed.forEach(molId => addChemElement(molId));

    const cid = String(responseCidJson["IdentifierList"]["CID"][0])
    addMolViewer(cid, molStr);

    const srcCid = "https://embed.molview.org/v1/?mode=balls&cid=".concat(cid);
    document.getElementById("molViewer" + cid).src = srcCid;

    var responseFormula = await fetch("https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/" + cid + "/property/MolecularFormula,Charge/JSON");
    var responseFormulaJson = await responseFormula.json();
    //document.getElementById("json").textContent = JSON.stringify(responseFormulaJson, undefined, 2);

    var responseFormulaName = responseFormulaJson["PropertyTable"]["Properties"][0]["MolecularFormula"];
    var responseCharge = responseFormulaJson["PropertyTable"]["Properties"][0]["Charge"]

    var moleculeInfo = "Molecule Formula: " + responseFormulaName;

    if (responseCharge != 0) {
      moleculeInfo += '\xa0\xa0\xa0\xa0\xa0\xa0\xa0' + "Charge: " + responseCharge;
    }

    writeNewMolecule(formula, cid, responseFormulaName, responseCharge);

    document.getElementById("moleculeForm" + cid).innerHTML = moleculeInfo;
  }


}


//All numbers auto-subscript
function fx(e) {
  if (!/[a-zA-Z0-9]+/.test(String.fromCharCode(e.which))) {
    return false;
  }
  var inputStart = e.target.selectionStart;
  var inputEnd = e.target.selectionEnd;
  var tempMolStr = molStr.slice(0, inputStart) + String.fromCharCode(e.which) + molStr.slice(inputEnd);
  molStr = tempMolStr;


  var k = String.fromCharCode(e.which);

  if (k.match(/\d/)) {
    var r = String.fromCharCode(8320 + Number(k));
    try { //IE
      document.selection.createRange().text = r;
    } catch (x) { //others
      var o = e.target
      var intStart = o.selectionStart;
      var intEnd = o.selectionEnd;
      o.value = (o.value).substring(0, intStart) + r +
      (o.value).substring(intEnd, o.value.length);
      o.selectionStart = o.selectionEnd = intStart + r.length;
      o.focus();
    }
    return false;
  }
  return true;
}
$("#moleculeText").keypress(fx);

//Deleting text from the text box, making sure to also delete from molStr variable
molecularFormulaTextBox.onkeydown = function() {
  var key = event.keyCode || event.charCode;

  if (key == 8 || key == 46) {
    var inputStart = molecularFormulaTextBox.selectionStart;
    var inputEnd = molecularFormulaTextBox.selectionEnd;
    var tempMolStr = ""
    if (inputStart == inputEnd) {
      tempMolStr = molStr.slice(0, inputStart - 1) + molStr.slice(inputStart);
    } else {
      tempMolStr = molStr.slice(0, inputStart) + molStr.slice(inputEnd);
    }
    molStr = tempMolStr;

  }

};

//If the textbox ever empties after key press, clear molStr variable
molecularFormulaTextBox.onkeyup = function() {
  if (molecularFormulaTextBox.value == "") {
    molStr = "";
  }
}

//When control or command pressed, stop it, and when enter is pressed, don't do new line but instead run getStructure()
$("#moleculeText").keypress(function(event) {
  if (event.keyCode == 13) {
    event.preventDefault();
    getStructure();
    this.blur();
  } else if (event.keyCode == 32 || event.keyCode == 17) {
    event.preventDefault();
    event.stopPropagation();
  }
});

//Command key for mac, don't run it
$("#moleculeText").keydown(function(e) {
  if (e.metaKey) {
    event.stopPropagation();
    event.preventDefault();
  }
});

//Can't drag around text in the box
molecularFormulaTextBox.ondrop = function preventDrop (e) {
  e.preventDefault();
};

//Don't allow pasting inside text box
window.onload = () => {
  molecularFormulaTextBox.onpaste = e => e.preventDefault();
}

//Adds a div with everything related to the 3d viewer
function addMolViewer(elementId, elementName) {
  var molDiv = document.getElementById("moleculeDiv");

  //Creates first Div to house everything
  var parentViewerDiv = document.createElement("div");
  parentViewerDiv.setAttribute("class", "parentViewerDiv");
  parentViewerDiv.setAttribute("id", "parentViewerDiv" + elementId);
  molDiv.appendChild(parentViewerDiv);

  //Creates the header inside parentViewerDiv
  var molHeader = document.createElement("h4");
  molHeader.setAttribute('id', "moleculeForm" + elementId);
  molHeader.setAttribute('class', "moleculeName");
  molHeader.innerHTML = "Molecular Formula: ";
  parentViewerDiv.appendChild(molHeader);

  //Creates a div just for the iframe
  var iframeDiv = document.createElement("div");
  iframeDiv.setAttribute("id", "molViewerDiv" + elementId);
  iframeDiv.setAttribute("class", "molViewerDiv");
  parentViewerDiv.appendChild(iframeDiv);

  //Creates the iframe
  var iframeViewer = document.createElement("iframe");
  iframeViewer.setAttribute('class', "molViewer");
  iframeViewer.setAttribute('id', "molViewer" + elementId);
  iframeViewer.setAttribute("frameborder", "0");
  iframeDiv.appendChild(iframeViewer);

  //Creates the close button
  var closeButton = document.createElement("input");
  var functionName = "removeMolViewer('molId', 'molName')";
  functionName = functionName.replace("molId", elementId);
  functionName = functionName.replace("molName", elementName)
  closeButton.type = "button";
  closeButton.setAttribute("id", "closeButton" + elementId);
  closeButton.setAttribute("class", "closeButton");
  closeButton.setAttribute("onclick", functionName);
  iframeDiv.appendChild(closeButton);

}

//Removes div with 3d viewer related to specific molecule
function removeMolViewer(elementId, elementName) {
  removeElement("parentViewerDiv" + elementId);
  var updatedMolecules = moleculesCurrentlyUsed.filter(function(elem){
   return elem != elementName;
  });
  moleculesCurrentlyUsed = updatedMolecules;

  setUniqueMolecules(moleculesCurrentlyUsed.join("").split(/(?=[A-Z0-9])/), false);
  updateHeader();


}

//Using array of molecule symbols, gets the unique symbols and then sets that to elementsCurrentlyUsed
//includeCurrentList will either include the elementsCurrentlyUsed list or not
function setUniqueMolecules(molecules, includeCurrentList = true) {
  var moleculeTypeList;
  if (includeCurrentList) {
    moleculeTypeList = elementsCurrentlyUsed.concat(molecules.filter(x => isNaN(x)));
  } else {
    moleculeTypeList = molecules.filter(x => isNaN(x));
  }
  //List of all molecules, numbers removed
  var uniqueMolecules = [];
  $.each(moleculeTypeList, function(i, el){
    if($.inArray(el, uniqueMolecules) === -1) uniqueMolecules.push(el);
  });
  elementsCurrentlyUsed = uniqueMolecules;
  elementsCurrentlyUsed.sort();
}

//Updates the molecular symbol color-coded header
function updateHeader() {
  removeChemElements();
  elementsCurrentlyUsed.forEach(molId => addChemElement(molId));
}

//Adds loading animation
function addLoading() {
  var p = document.getElementById("moleculeDiv");
  var newElement = document.createElement("span");
  newElement.setAttribute("id", "loading");
  newElement.setAttribute("class", "loader");

  p.appendChild(newElement);
}

//Adds each color coded chem symbol to the header
function addChemElement(elementId) {
  var p = document.getElementById("elementsUsedDiv");
  var newElement = document.createElement("span");
  newElement.setAttribute("id", elementId);
  newElement.setAttribute("class", "elementsUsed");
  newElement.setAttribute("style", "color:#" + elementColorDict[elementId]);
  newElement.innerHTML = " " + elementId + " ";
  p.appendChild(newElement);
}

//Clears the header
function removeChemElements() {
  $("#elementsUsedDiv").empty();
}

//Removes an html element from the doc, name is confusing but too much work to replace
function removeElement(elementId) {
  // Removes an html element from the document
  var element = document.getElementById(elementId);
  element.parentNode.removeChild(element);
}

//Writing molecule to the databse
function writeNewMolecule(userTypedMol, cidVal, cidMolName, molCharge) {
  firebase.database().ref('molDict/' + userTypedMol).set({
    charge: molCharge,
    molName: cidMolName,
    cid : cidVal
  });
}

document.getElementById("clear").onclick = clear;
document.getElementById("create").onclick = getStructure;
