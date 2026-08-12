// -------------------------------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License (MIT). See LICENSE in the repo root for license information.
// -------------------------------------------------------------------------------------------------

using System;
using System.Linq;
using System.Net;
using Hl7.Fhir.Model;
using Microsoft.Health.Fhir.Client;
using Microsoft.Health.Fhir.Core.Extensions;
using Microsoft.Health.Fhir.Tests.Common;
using Microsoft.Health.Fhir.Tests.Common.FixtureParameters;
using Microsoft.Health.Fhir.Tests.E2E.Common;
using Microsoft.Health.Test.Utilities;
using Xunit;
using Task = System.Threading.Tasks.Task;

namespace Microsoft.Health.Fhir.Tests.E2E.Rest
{
    [Trait(Traits.OwningTeam, OwningTeam.Fhir)]
    [Trait(Traits.Category, Categories.Web)]
    [HttpIntegrationFixtureArgumentSets(DataStore.All, Format.Json)]
    public class ImagingStudyTests : IClassFixture<HttpIntegrationTestFixture>
    {
        private readonly TestFhirClient _client;

        public ImagingStudyTests(HttpIntegrationTestFixture fixture)
        {
            _client = fixture.TestFhirClient;
        }

#if !Stu3
        [Fact]
        [Trait(Traits.Priority, Priority.One)]
        public async Task GivenAClinicValidImagingStudy_WhenPostingToHttp_TheServerShouldRespondSuccessfully()
        {
            Patient patient = await _client.CreateAsync(Samples.GetDefaultPatient().ToPoco<Patient>());
            ImagingStudy study = CreateClinicImagingStudy(patient.Id);

            using FhirResponse<ImagingStudy> response = await _client.CreateAsync(study);

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            Assert.NotNull(response.Headers.Location);
            Assert.NotNull(response.Resource.Id);
            Assert.Equal(ImagingStudy.ImagingStudyStatus.Available, response.Resource.Status);
            Assert.Contains(response.Resource.Modality, m => m.Code == "US");
        }

        [Fact]
        [Trait(Traits.Priority, Priority.One)]
        public async Task GivenAnImagingStudyMissingRequiredClinicFields_WhenPostingToHttp_TheServerShouldRespondWithBadRequest()
        {
            var incomplete = new ImagingStudy
            {
                Status = ImagingStudy.ImagingStudyStatus.Available,
                Subject = new ResourceReference("Patient/pat-missing-fields"),
            };

            using FhirClientException ex = await Assert.ThrowsAsync<FhirClientException>(
                () => _client.CreateAsync(incomplete));

            Assert.Equal(HttpStatusCode.BadRequest, ex.StatusCode);
            Assert.NotNull(ex.OperationOutcome);
            Assert.Contains(
                ex.OperationOutcome.Issue,
                i => i.Severity == OperationOutcome.IssueSeverity.Error
                    && i.Code == OperationOutcome.IssueType.Required);
        }

        [Fact]
        [Trait(Traits.Priority, Priority.One)]
        public async Task GivenAPatientCompartment_WhenRetrievingImagingStudy_ThenOnlyThatPatientsStudiesAreReturned()
        {
            Patient patientA = await _client.CreateAsync(Samples.GetDefaultPatient().ToPoco<Patient>());
            Patient patientB = await _client.CreateAsync(Samples.GetDefaultPatient().ToPoco<Patient>());

            ImagingStudy studyA = await _client.CreateAsync(CreateClinicImagingStudy(patientA.Id));
            await _client.CreateAsync(CreateClinicImagingStudy(patientB.Id));

            using FhirResponse<Bundle> bundleResponse = await _client.SearchAsync($"Patient/{patientA.Id}/ImagingStudy");

            Assert.Equal(HttpStatusCode.OK, bundleResponse.StatusCode);
            Assert.NotNull(bundleResponse.Resource);
            Assert.Contains(bundleResponse.Resource.Entry, e => e.Resource is ImagingStudy img && img.Id == studyA.Id);
            Assert.All(
                bundleResponse.Resource.Entry.Select(e => e.Resource).OfType<ImagingStudy>(),
                img => Assert.Equal($"Patient/{patientA.Id}", img.Subject.Reference));
        }

        private static ImagingStudy CreateClinicImagingStudy(string patientId)
        {
            return new ImagingStudy
            {
                Status = ImagingStudy.ImagingStudyStatus.Available,
                Subject = new ResourceReference($"Patient/{patientId}"),
                Started = DateTimeOffset.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ"),
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
