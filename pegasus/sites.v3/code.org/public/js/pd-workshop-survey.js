$(document).ready(function () {
  $('#pd-workshop-survey-form').find("select").selectize({
    plugins: ['fast_click']
  });

  $('#pd-workshop-survey-form').submit(function (event) {
    PdWorkshopSurveyFormSubmit(event);
  });

  $("input[name=consent_b]:radio").change(function () {
    if ($("input[name=consent_b][value=1]").is(":checked")) {
      $(".consent-only").show();
    } else {
      $(".consent-only").hide();
    }
  });

  $("input[name=will_teach_b]:radio").change(function () {
    if ($("input[name=will_teach_b][value=0]").is(":checked")) {
      $("#will-teach-no-explain-wrapper").show();
    } else {
      $("#will-teach-no-explain-wrapper").hide();
    }
  });

  $("input[name='reason_for_attending_ss[]']:checkbox").change(function () {
    if ($("input[name='reason_for_attending_ss[]'][value='Other']").is(":checked")) {
      $('#reason-for-attending-other-wrapper').show();
    } else {
      $('#reason-for-attending-other-wrapper').hide();
    }
  });

  $("input[name='how_heard_ss[]']:checkbox").change(function () {
    if ($("input[name='how_heard_ss[]'][value='Other']").is(":checked")) {
      $('#how-heard-other-wrapper').show();
    } else {
      $('#how-heard-other-wrapper').hide();
    }
  });

  $("input[name='subjects_taught_ss[]']").change(function () {
    if ($("input[name='subjects_taught_ss[]'][value='Computer Science']").is(":checked")) {
      $('#years-taught-cs-wrapper').show();
    } else {
      $('#years-taught-cs-wrapper').hide();
    }
  });

  $("input[name=willing_to_talk_b]:radio").change(function () {
    if ($("input[name=willing_to_talk_b][value=1]").is(":checked")) {
      $('#willing-to-talk-contact-wrapper').show();
    } else {
      $('#willing-to-talk-contact-wrapper').hide();
    }
  });

  $(".agree-scale").tooltip();
});

function processResponse() {

  // TODO: remove this redirect, and re-enable #materials-order in the pd-workshop-survey form,
  // once we're satisfied with the Mimeo SSO feature.
  if (window.pdWorkshopSurvey.course === "CS Fundamentals") {
    window.location.href = "/pd-workshop-survey/materials/" + window.pdWorkshopSurvey.enrollmentCode;
    return;
  }

  $("#btn-submit").removeAttr('disabled');
  $("#btn-submit").removeClass("button_disabled").addClass("button_enabled");
  $('#pd-workshop-survey-form').hide();
  $('#thanks').show();
  $('#materials-order').show();
}

function processError(data) {
  $('.has-error').removeClass('has-error');

  var error_field_names = Object.keys(data.responseJSON);
  var errors_count = error_field_names.length;

  for (var i = 0; i < errors_count; ++i) {
    var error_field_name = error_field_names[i].replace(/_ss$/,'_ss[]');
    var query = ".control-label[for='" + error_field_name + "']";
    $(query).parents('.form-group').addClass('has-error');
  }

  $('#error-message').text('An error occurred. Please check to make sure all required fields have been filled out.').show();

  $('body').scrollTop(0);
  $("#btn-submit").removeAttr('disabled');
  $("#btn-submit").removeClass("button_disabled").addClass("button_enabled");
}

function PdWorkshopSurveyFormSubmit(event) {
  $("#btn-submit").attr('disabled','disabled');
  $("#btn-submit").removeClass("button_enabled").addClass("button_disabled");

  $.ajax({
    url: "/forms/PdWorkshopSurvey",
    type: "post",
    dataType: "json",
    data: $('#pd-workshop-survey-form').serialize()
  }).done(processResponse).fail(processError);

  event.preventDefault();
}
