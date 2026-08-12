// -------------------------------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License (MIT). See LICENSE in the repo root for license information.
// -------------------------------------------------------------------------------------------------

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using EnsureThat;
using FluentValidation;
using FluentValidation.Results;
using Hl7.Fhir.ElementModel;
using Hl7.FhirPath;
using Microsoft.Health.Fhir.Core.Models;

namespace Microsoft.Health.Fhir.Core.Features.Validation
{
    /// <summary>
    /// MidSizedClinic FHIR-10 required fields for ImagingStudy on create/update (R4+).
    /// status, modality (with coding), started, description, subject → Patient/{id}.
    /// </summary>
    public class ImagingStudyRequiredFieldsValidator : AbstractValidator<ResourceElement>
    {
        public override Task<ValidationResult> ValidateAsync(ValidationContext<ResourceElement> context, CancellationToken cancellation = default)
        {
            return Task.FromResult(Validate(context));
        }

        public override ValidationResult Validate(ValidationContext<ResourceElement> context)
        {
            EnsureArg.IsNotNull(context, nameof(context));

            var failures = new List<ValidationFailure>();

            // Clinic FHIR-10 rules target R4+ study-level modality/description.
            if (ModelInfoProvider.Version == FhirSpecification.Stu3)
            {
                return new ValidationResult(failures);
            }

            if (context.InstanceToValidate is ResourceElement resourceElement)
            {
                if (IsImagingStudy(resourceElement.InstanceType))
                {
                    failures.AddRange(ValidateImagingStudy(resourceElement.Instance));
                }
                else if (resourceElement.InstanceType.Equals(KnownResourceTypes.Bundle, StringComparison.OrdinalIgnoreCase))
                {
                    foreach (ITypedElement entryResource in resourceElement.Instance.Select("entry.resource"))
                    {
                        if (IsImagingStudy(entryResource.InstanceType))
                        {
                            failures.AddRange(ValidateImagingStudy(entryResource));
                        }
                    }
                }
            }

            foreach (ValidationFailure failure in failures)
            {
                context.AddFailure(failure);
            }

            return new ValidationResult(failures);
        }

        private static bool IsImagingStudy(string instanceType)
        {
            return instanceType != null
                && instanceType.Equals(KnownResourceTypes.ImagingStudy, StringComparison.OrdinalIgnoreCase);
        }

        private static IEnumerable<ValidationFailure> ValidateImagingStudy(ITypedElement imagingStudy)
        {
            EnsureArg.IsNotNull(imagingStudy, nameof(imagingStudy));

            if (!HasNonEmptyScalar(imagingStudy, "status"))
            {
                yield return RequiredFailure("ImagingStudy.status", "ImagingStudy.status is required.");
            }

            IList<ITypedElement> modalities = imagingStudy.Select("modality").ToList();
            bool hasModalityCoding = modalities.Any(m => HasNonEmptyScalar(m, "code"));
            if (!hasModalityCoding)
            {
                yield return RequiredFailure(
                    "ImagingStudy.modality",
                    "ImagingStudy.modality must include at least one Coding with a code.");
            }

            if (!HasNonEmptyScalar(imagingStudy, "started"))
            {
                yield return RequiredFailure("ImagingStudy.started", "ImagingStudy.started is required.");
            }

            if (!HasNonEmptyScalar(imagingStudy, "description"))
            {
                yield return RequiredFailure("ImagingStudy.description", "ImagingStudy.description is required.");
            }

            string subjectReference = imagingStudy.Scalar("subject.reference")?.ToString();
            if (string.IsNullOrWhiteSpace(subjectReference)
                || !subjectReference.StartsWith("Patient/", StringComparison.Ordinal))
            {
                yield return RequiredFailure(
                    "ImagingStudy.subject",
                    "ImagingStudy.subject must reference Patient/{id}.");
            }
        }

        private static bool HasNonEmptyScalar(ITypedElement element, string fhirPath)
        {
            object value = element.Scalar(fhirPath);
            return value != null && !string.IsNullOrWhiteSpace(value.ToString());
        }

        private static FhirValidationFailure RequiredFailure(string fhirPath, string message)
        {
            return new FhirValidationFailure(
                fhirPath,
                message,
                new OperationOutcomeIssue(
                    OperationOutcomeConstants.IssueSeverity.Error,
                    OperationOutcomeConstants.IssueType.Required,
                    diagnostics: message,
                    expression: new[] { fhirPath }));
        }
    }
}
