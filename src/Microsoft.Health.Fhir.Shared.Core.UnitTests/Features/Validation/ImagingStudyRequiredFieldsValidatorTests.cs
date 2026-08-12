// -------------------------------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License (MIT). See LICENSE in the repo root for license information.
// -------------------------------------------------------------------------------------------------

using System.Linq;
using Hl7.Fhir.Model;
using Microsoft.Health.Fhir.Core.Extensions;
using Microsoft.Health.Fhir.Core.Features.Validation;
using Microsoft.Health.Fhir.Core.Models;
using Microsoft.Health.Fhir.Tests.Common;
using Microsoft.Health.Test.Utilities;
using Xunit;

namespace Microsoft.Health.Fhir.Core.UnitTests.Features.Validation
{
    [Trait(Traits.OwningTeam, OwningTeam.Fhir)]
    [Trait(Traits.Category, Categories.Validate)]
    public class ImagingStudyRequiredFieldsValidatorTests
    {
        private readonly ImagingStudyRequiredFieldsValidator _validator = new ImagingStudyRequiredFieldsValidator();

        [Fact]
        public void GivenAPatient_WhenValidating_ThenValidatorIsNoOp()
        {
            var result = _validator.Validate(Samples.GetDefaultPatient());

            Assert.True(result.IsValid);
        }

        [Fact]
        public void GivenKnownResourceTypes_WhenCheckingImagingStudyConst_ThenValueIsImagingStudy()
        {
            Assert.Equal("ImagingStudy", KnownResourceTypes.ImagingStudy);
        }

#if !Stu3
        [Fact]
        public void GivenImagingStudyWithAllRequiredFields_WhenValidating_ThenIsValid()
        {
            var result = _validator.Validate(CreateValidClinicImagingStudy().ToResourceElement());

            Assert.True(
                result.IsValid,
                string.Join("; ", result.Errors.Select(e => $"{e.PropertyName}: {e.ErrorMessage}")));
        }

        [Fact]
        public void GivenImagingStudyMissingStatus_WhenValidating_ThenRequiredFailureIsReturned()
        {
            ImagingStudy study = CreateValidClinicImagingStudy();
            study.Status = null;

            var result = _validator.Validate(study.ToResourceElement());

            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, e => e.PropertyName == "ImagingStudy.status");
            Assert.Contains(result.Errors, e => e is FhirValidationFailure);
        }

        [Fact]
        public void GivenImagingStudyMissingModalityCoding_WhenValidating_ThenRequiredFailureIsReturned()
        {
            ImagingStudy study = CreateValidClinicImagingStudy();
            study.Modality.Clear();

            var result = _validator.Validate(study.ToResourceElement());

            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, e => e.PropertyName == "ImagingStudy.modality");
        }

        [Fact]
        public void GivenImagingStudyMissingStarted_WhenValidating_ThenRequiredFailureIsReturned()
        {
            ImagingStudy study = CreateValidClinicImagingStudy();
            study.Started = null;

            var result = _validator.Validate(study.ToResourceElement());

            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, e => e.PropertyName == "ImagingStudy.started");
        }

        [Fact]
        public void GivenImagingStudyMissingDescription_WhenValidating_ThenRequiredFailureIsReturned()
        {
            ImagingStudy study = CreateValidClinicImagingStudy();
            study.Description = null;

            var result = _validator.Validate(study.ToResourceElement());

            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, e => e.PropertyName == "ImagingStudy.description");
        }

        [Fact]
        public void GivenImagingStudySubjectNotPatient_WhenValidating_ThenRequiredFailureIsReturned()
        {
            ImagingStudy study = CreateValidClinicImagingStudy();
            study.Subject = new ResourceReference("Device/device-1");

            var result = _validator.Validate(study.ToResourceElement());

            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, e => e.PropertyName == "ImagingStudy.subject");
        }

        [Fact]
        public void GivenImagingStudyWithEmptySubjectReference_WhenValidating_ThenRequiredFailureIsReturned()
        {
            ImagingStudy study = CreateValidClinicImagingStudy();
            study.Subject = new ResourceReference(string.Empty);

            var result = _validator.Validate(study.ToResourceElement());

            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, e => e.PropertyName == "ImagingStudy.subject");
        }

        [Fact]
        public void GivenImagingStudyWithNullSubject_WhenValidating_ThenRequiredFailureIsReturned()
        {
            ImagingStudy study = CreateValidClinicImagingStudy();
            study.Subject = null;

            var result = _validator.Validate(study.ToResourceElement());

            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, e => e.PropertyName == "ImagingStudy.subject");
        }

        [Fact]
        public void GivenImagingStudyWithWhitespaceOnlyDescription_WhenValidating_ThenRequiredFailureIsReturned()
        {
            ImagingStudy study = CreateValidClinicImagingStudy();
            study.Description = "   ";

            var result = _validator.Validate(study.ToResourceElement());

            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, e => e.PropertyName == "ImagingStudy.description");
        }

        [Fact]
        public void GivenImagingStudyWithModalityCodingMissingCode_WhenValidating_ThenRequiredFailureIsReturned()
        {
            ImagingStudy study = CreateValidClinicImagingStudy();
            study.Modality.Clear();
            study.Modality.Add(new Coding("http://dicom.nema.org/resources/ontology/DCM", null));

            var result = _validator.Validate(study.ToResourceElement());

            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, e => e.PropertyName == "ImagingStudy.modality");
        }

        [Fact]
        public void GivenBundleContainingInvalidImagingStudy_WhenValidating_ThenRequiredFailureIsReturned()
        {
            var incomplete = new ImagingStudy
            {
                Status = ImagingStudy.ImagingStudyStatus.Available,
                Subject = new ResourceReference("Patient/pat-1001"),
            };
            var bundle = new Bundle
            {
                Type = Bundle.BundleType.Transaction,
                Entry =
                {
                    new Bundle.EntryComponent { Resource = incomplete },
                },
            };

            var result = _validator.Validate(bundle.ToResourceElement());

            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, e => e.PropertyName == "ImagingStudy.modality");
            Assert.Contains(result.Errors, e => e.PropertyName == "ImagingStudy.started");
            Assert.Contains(result.Errors, e => e.PropertyName == "ImagingStudy.description");
        }

        private static ImagingStudy CreateValidClinicImagingStudy()
        {
            return new ImagingStudy
            {
                Status = ImagingStudy.ImagingStudyStatus.Available,
                Subject = new ResourceReference("Patient/pat-1001"),
                Started = "2024-06-01T10:00:00Z",
                Description = "Abdominal ultrasound — routine",
                Modality =
                {
                    new Coding("http://dicom.nema.org/resources/ontology/DCM", "US"),
                },
            };
        }
#endif
    }
}
