# MidSizedClinic Imaging Workflow

## Organization & Context

**MidSizedClinic** is a mid-sized ultrasound imaging center serving a regional network of primary-care and specialist referrers. We handle 50–100 patient encounters per week, managing patient records, imaging studies, radiologist reports, and technician worklists. All patient data is PHI under HIPAA; access must be authenticated, role-based, and auditable.

## Core Workflow: From Booking to Report Delivery

### 1. Patient Arrives for Imaging Appointment

**Actor:** Clinic receptionist / technician  
**Goal:** Confirm patient identity, retrieve prior imaging history

**Steps:**
- Patient provides name and date of birth (or MRN if returning)
- Technician searches clinic system for patient record
- System returns: patient demographics + **all prior imaging studies from past 5 years** (ultrasounds, reports, radiologist findings)
- Technician confirms this is the right patient and reviews history (context for new study)

**Data needed:** Patient demographics + search by name/DOB/MRN + retrieve all ImagingStudy resources linked to patient

---

### 2. Technician Captures New Ultrasound

**Actor:** Sonographer / imaging technician  
**Goal:** Store the new imaging study in the system

**Steps:**
- Technician performs ultrasound and captures images
- System creates a new **ImagingStudy** record with:
  - Patient reference
  - Study date/time
  - Modality (ultrasound)
  - Status (initial capture)
  - Optional: preliminary notes from tech (e.g., "abdominal, no obvious findings")
- Images stored (external to FHIR Server, referenced by StudyInstanceUID)
- Study marked as "ready for radiologist review"

**Data needed:** POST /ImagingStudy with patient reference, status, metadata

---

### 3. Radiologist Reads Study & Authorizes Report

**Actor:** Radiologist  
**Goal:** Review study and author a signed report

**Steps:**
- Radiologist views list of studies pending review
- Radiologist opens study, reviews images (external PACS system)
- Radiologist authors **DiagnosticReport** containing:
  - Clinical impression (findings)
  - Recommendations (e.g., follow-up, referral)
  - Status (final, signed)
  - Radiologist signature (practitioner reference + timestamp)
- Report linked to the ImagingStudy
- Study marked as "reported"

**Data needed:** POST /DiagnosticReport linked to ImagingStudy, with radiologist reference and status

---

### 4. Clinic Sends Report to Referring Provider

**Actor:** Clinic staff / integration system  
**Goal:** Deliver report to referring provider's EHR securely

**Steps:**
- System queries: GET /DiagnosticReport/{id} (retrieves report)
- System retrieves: GET /Patient/{id} + GET /ImagingStudy/{id} (context)
- System sends via:
  - Direct (secure email to provider's inbox), OR
  - FHIR API (if provider has SMART app or API integration)
- Referring provider receives report in their EHR

**Data needed:** FHIR API with SMART-on-FHIR support so provider's EHR can fetch results securely

---

### 5. Compliance Officer Audits Access

**Actor:** Compliance officer  
**Goal:** Verify that only authorized staff accessed patient PHI

**Steps:**
- Monthly: pull audit log of all API calls touching patient data
- Filter by: patient ID, user role, date range, action (read, write, export)
- Verify: technician accessed imaging only for scheduled study, radiologist read only their assigned studies, no unauthorized exports
- Generate compliance report for HIPAA audit trail

**Data needed:** Structured logging of all FHIR API calls with: user, role, resource accessed, timestamp, action

---

## User Roles & Permissions

| Role | Can Do | Cannot Do |
|------|--------|-----------|
| **Technician** | Search patients, create/read ImagingStudy, update study status | Write DiagnosticReport, delete data, export bulk |
| **Radiologist** | Read ImagingStudy, create/update DiagnosticReport | Delete studies, access other providers' reports, bulk export |
| **Clinic Admin** | All of above + delete studies (audit-logged), manage users, run bulk operations | Cannot perform clinical actions (read/write reports) |
| **Referring Provider (via SMART app)** | Read patient's ImagingStudy + DiagnosticReport (only their referrals) | Create/update, see other patients' data |
| **Compliance Officer** | Read-only audit logs, export access reports | No clinical data access |

---

## Non-Functional Requirements

- **Search latency:** < 1 second (technician at check-in needs instant patient lookup)
- **Availability:** 99% uptime during clinic hours (M–F 7am–6pm)
- **Data residency:** On-premise SQL Server (comply with clinic IT policy, audit access via database-level logs)
- **Audit trail:** Every API call logged with user, role, resource, timestamp; searchable for compliance audits
- **Bulk migration:** Ability to import 15 years of legacy patient data without weeks of manual entry (bulk import)

---

## Success Metrics

1. **Ramp time:** New technician productive in imaging workflow within 2 hours of onboarding
2. **Availability:** Zero data loss during migration from legacy system to FHIR
3. **Compliance:** 100% of PHI access captured in audit log; zero unauthorized access detected in monthly audit
4. **Performance:** Study lookup < 1 second; report delivery to referrer < 5 minutes
