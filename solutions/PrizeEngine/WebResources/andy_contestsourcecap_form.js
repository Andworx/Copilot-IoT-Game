(function (namespace) {
  "use strict";

  const campaignField = "andy_campaignname";
  const sourceFieldCandidates = ["andy_source", "andy_contestsource", "andy_sourceidentifier"];
  const nameField = "andy_settingname";

  function getFormContext(executionContext) {
    return executionContext && typeof executionContext.getFormContext === "function"
      ? executionContext.getFormContext()
      : null;
  }

  function getLookupName(attribute) {
    const value = attribute && typeof attribute.getValue === "function" ? attribute.getValue() : null;
    return Array.isArray(value) && value.length > 0 ? value[0].name : null;
  }

  function getTextValue(attribute) {
    const value = attribute && typeof attribute.getValue === "function" ? attribute.getValue() : null;
    return typeof value === "string" ? value.trim() : null;
  }

  function findSourceAttribute(formContext) {
    for (const fieldName of sourceFieldCandidates) {
      const attribute = formContext.getAttribute(fieldName);
      if (attribute) return attribute;
    }
    return null;
  }

  function setGeneratedName(formContext) {
    const nameAttribute = formContext.getAttribute(nameField);
    const campaignAttribute = formContext.getAttribute(campaignField);
    const sourceAttribute = findSourceAttribute(formContext);
    if (!nameAttribute || !campaignAttribute || !sourceAttribute) return;

    const campaignName = getLookupName(campaignAttribute);
    const sourceName = getLookupName(sourceAttribute) || getTextValue(sourceAttribute);
    if (!campaignName || !sourceName) return;

    nameAttribute.setValue(`${campaignName} - ${sourceName}`);
    nameAttribute.setSubmitMode("always");
  }

  function registerOnChange(attribute, handler) {
    if (attribute && typeof attribute.addOnChange === "function") {
      attribute.addOnChange(handler);
    }
  }

  namespace.ContestSourceCap = {
    onLoad: function (executionContext) {
      const formContext = getFormContext(executionContext);
      if (!formContext) return;

      const updateName = function () {
        setGeneratedName(formContext);
      };

      registerOnChange(formContext.getAttribute(campaignField), updateName);
      registerOnChange(findSourceAttribute(formContext), updateName);
      updateName();
    },
  };
})(window.AndworxPrizeEngine = window.AndworxPrizeEngine || {});