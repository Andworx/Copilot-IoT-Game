var AndworxPrizeEngine = AndworxPrizeEngine || {};
AndworxPrizeEngine.ContestCampaign = (function () {
  function onLoad(executionContext) {
    var formContext = executionContext.getFormContext();
    var eventNameAttribute = formContext.getAttribute("andy_eventname");
    var startTimeAttribute = formContext.getAttribute("andy_starttime");
    var endTimeAttribute = formContext.getAttribute("andy_endtime");

    [eventNameAttribute, startTimeAttribute, endTimeAttribute].forEach(function (attribute) {
      if (attribute) {
        attribute.addOnChange(updateCheckInCodePrefix);
      }
    });

    updateCheckInCodePrefix(executionContext);
  }

  function updateCheckInCodePrefix(executionContext) {
    var formContext = executionContext.getFormContext();
    var prefixAttribute = formContext.getAttribute("andy_checkincodeprefix");

    if (!prefixAttribute) {
      return;
    }

    var eventName = getValue(formContext, "andy_eventname");
    var startTime = getValue(formContext, "andy_starttime");
    var endTime = getValue(formContext, "andy_endtime");

    if (!eventName || !startTime || !endTime) {
      prefixAttribute.setValue(null);
      prefixAttribute.setSubmitMode("always");
      return;
    }

    prefixAttribute.setValue(buildPrefix(eventName, startTime, endTime));
    prefixAttribute.setSubmitMode("always");
  }

  function getValue(formContext, fieldName) {
    var attribute = formContext.getAttribute(fieldName);
    return attribute ? attribute.getValue() : null;
  }

  function buildPrefix(eventName, startTime, endTime) {
    var eventPart = eventName
      .toString()
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 16);

    return [eventPart, formatDate(startTime), formatDate(endTime)]
      .filter(Boolean)
      .join("-");
  }

  function formatDate(value) {
    var date = value instanceof Date ? value : new Date(value);

    if (isNaN(date.getTime())) {
      return "";
    }

    return [
      date.getFullYear().toString().substring(2),
      pad(date.getMonth() + 1),
      pad(date.getDate())
    ].join("");
  }

  function pad(value) {
    return value.toString().padStart(2, "0");
  }

  return {
    onLoad: onLoad
  };
})();
