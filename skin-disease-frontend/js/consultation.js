function openDoctorPage(doctorName, specialization) {
  window.location.href =
    "doctor.html?doctor=" + encodeURIComponent(doctorName) +
    "&spec=" + encodeURIComponent(specialization);
}

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("mapSearchInput");
  const button = document.getElementById("mapSearchBtn");
  const mapFrame = document.getElementById("mapFrame");
  const page1Btn = document.getElementById("page1Btn");
  const page2Btn = document.getElementById("page2Btn");
  const hospitalPage1 = document.getElementById("hospitalPage1");
  const hospitalPage2 = document.getElementById("hospitalPage2");

  if (!input || !button || !mapFrame || !hospitalPage1 || !hospitalPage2) return;

  const STORAGE_KEY = "consultationMapLocation";
  const DEFAULT_CITY = "Vijayawada";
  const PAGE_SIZE = 6;

  const formatPhone = (value) => {
    if (!value) return "Not available";
    return value.replace(/^(\+91)(\d{3})(\d{3})(\d{4})$/, "$1 $2 $3 $4");
  };

  const escapeJs = (value) => String(value || "").replace(/'/g, "\\'");

  const hospitalData = {
    vijayawada: [
      {
        name: "Manipal Hospitals (Vijayawada)",
        address: "Tadepalli, Near Benz Circle, Vijayawada, Andhra Pradesh 522501",
        phone: "+918662457777",
        rating: "4.5",
        doctor: "Dr. Rajesh",
        doctorSpec: "Dermatologist"
      },
      {
        name: "Ramesh Hospitals – Benz Circle",
        address: "Ring Road, Near Benz Circle, Vijayawada, Andhra Pradesh 520008",
        phone: "+918662487777",
        rating: "4.3",
        doctor: "Dr. Anjali",
        doctorSpec: "Skin Specialist"
      },
      {
        name: "Sentini Hospitals",
        address: "Ring Road, Beside DV Manor Hotel, Benz Circle, Vijayawada, AP 520010",
        phone: "+918666679999",
        rating: "4.2",
        doctor: "Dr. Vivek",
        doctorSpec: "General Physician"
      },
      {
        name: "Andhra Hospitals",
        address: "CSI Aswini Street, Governorpet, Vijayawada",
        phone: "+918662487777",
        rating: "4.0",
        doctor: "Dr. Priya",
        doctorSpec: "Dermatologist"
      },
      {
        name: "Trust Hospital",
        address: "Near Benz Circle Flyover, Vijayawada, Andhra Pradesh 520008",
        phone: "+918662479999",
        rating: "4.1",
        doctor: "Dr. Kiran",
        doctorSpec: "Cosmetic Dermatologist"
      },
      {
        name: "Aayush Hospitals",
        address: "Near Benz Circle, Patamata, Vijayawada, AP 520010",
        phone: "+918666669999",
        rating: "4.0",
        doctor: "Dr. Meera",
        doctorSpec: "Dermatologist"
      },
      {
        name: "Kamineni Hospitals (Vijayawada Unit)",
        address: "Near Autonagar, Vijayawada",
        phone: "+918666603333",
        rating: "4.2",
        doctor: "Dr. Arjun",
        doctorSpec: "Skin Specialist"
      }
    ],
    guntur: [
      {
        name: "Ramesh Hospitals (Guntur)",
        specialty: "Multispecialty, Dermatology, General Medicine",
        address: "Kothapet, Guntur, Andhra Pradesh 522001",
        phone: "+918632221000",
        rating: "4.3",
        doctor: "Dr. Sandeep",
        doctorSpec: "Dermatologist"
      },
      {
        name: "Katuri Medical College & Hospital",
        specialty: "Multispecialty, Skin & Allergy, Pediatrics",
        address: "Chinapallagadda, Guntur, Andhra Pradesh 522004",
        phone: "+918632112222",
        rating: "4.1",
        doctor: "Dr. Lakshmi",
        doctorSpec: "Skin Specialist"
      },
      {
        name: "NRI General Hospital",
        specialty: "Multispecialty, Dermatology, Orthopedics",
        address: "Mangalagiri, Guntur, Andhra Pradesh 522503",
        phone: "+918632376000",
        rating: "4.2",
        doctor: "Dr. Aruna",
        doctorSpec: "Dermatologist"
      },
      {
        name: "St. Joseph's General Hospital",
        specialty: "General Medicine, Dermatology, ENT",
        address: "Brodipet, Guntur, Andhra Pradesh 522002",
        phone: "+918632232233",
        rating: "4.0",
        doctor: "Dr. Naveen",
        doctorSpec: "General Physician"
      },
      {
        name: "Lakshmi Narayana Hospital",
        specialty: "Dermatology, General Surgery, Diabetology",
        address: "Arundelpet, Guntur, Andhra Pradesh 522002",
        phone: "+918632256789",
        rating: "4.0",
        doctor: "Dr. Priyanka",
        doctorSpec: "Dermatologist"
      },
      {
        name: "Arogyasri Hospitals (Guntur)",
        specialty: "Multispecialty, Skin Care, Cardiology",
        address: "Lakshmipuram, Guntur, Andhra Pradesh 522007",
        phone: "+918632266777",
        rating: "4.1",
        doctor: "Dr. Harsha",
        doctorSpec: "Dermatologist"
      },
      {
        name: "Amaravathi Institute of Medical Sciences",
        specialty: "Multispecialty, Dermatology, General Medicine",
        address: "Govt. General Hospital Road, Guntur, Andhra Pradesh 522001",
        phone: "+918632244555",
        rating: "4.0",
        doctor: "Dr. Keerthi",
        doctorSpec: "Skin Specialist"
      },
      {
        name: "Padmavathi Skin & Cosmetology Clinic",
        specialty: "Dermatology, Cosmetology, Acne Treatment",
        address: "Naidupet, Guntur, Andhra Pradesh 522004",
        phone: "+919876500321",
        rating: "4.2",
        doctor: "Dr. Padma",
        doctorSpec: "Cosmetic Dermatologist"
      }
    ],
    hyderabad: [
      {
        name: "Apollo Hospitals (Jubilee Hills)",
        specialty: "Multispecialty, Dermatology, Oncology",
        address: "Jubilee Hills, Hyderabad, Telangana 500033",
        phone: "+914023441066",
        rating: "4.6",
        doctor: "Dr. Aisha",
        doctorSpec: "Dermatologist"
      },
      {
        name: "Yashoda Hospitals (Somajiguda)",
        specialty: "Multispecialty, Skin & Allergy",
        address: "Somajiguda, Hyderabad, Telangana 500082",
        phone: "+914045662000",
        rating: "4.4",
        doctor: "Dr. Nikhil",
        doctorSpec: "Skin Specialist"
      },
      {
        name: "KIMS Hospitals (Secunderabad)",
        specialty: "Multispecialty, Cosmetic Dermatology",
        address: "Secunderabad, Hyderabad, Telangana 500003",
        phone: "+914044822222",
        rating: "4.3",
        doctor: "Dr. Riya",
        doctorSpec: "Cosmetic Dermatologist"
      },
      {
        name: "Care Hospitals (Banjara Hills)",
        specialty: "Multispecialty, Dermatology, General Medicine",
        address: "Banjara Hills, Hyderabad, Telangana 500034",
        phone: "+914061616161",
        rating: "4.4",
        doctor: "Dr. Arvind",
        doctorSpec: "Dermatologist"
      },
      {
        name: "AIG Hospitals (Gachibowli)",
        specialty: "Multispecialty, Dermatology, Gastroenterology",
        address: "Gachibowli, Hyderabad, Telangana 500032",
        phone: "+914067677777",
        rating: "4.5",
        doctor: "Dr. Farah",
        doctorSpec: "Dermatologist"
      },
      {
        name: "Continental Hospitals (Nanakramguda)",
        specialty: "Multispecialty, Skin & Allergy, ENT",
        address: "Nanakramguda, Hyderabad, Telangana 500032",
        phone: "+914067088000",
        rating: "4.4",
        doctor: "Dr. Kiran",
        doctorSpec: "Skin Specialist"
      },
      {
        name: "Sunshine Hospitals (Paradise)",
        specialty: "Multispecialty, Dermatology, Orthopedics",
        address: "Paradise, Secunderabad, Telangana 500003",
        phone: "+914045911911",
        rating: "4.2",
        doctor: "Dr. Meera",
        doctorSpec: "Dermatologist"
      },
      {
        name: "Medicover Hospitals (HITEC City)",
        specialty: "Multispecialty, Dermatology, General Medicine",
        address: "HITEC City, Hyderabad, Telangana 500081",
        phone: "+914067202222",
        rating: "4.3",
        doctor: "Dr. Sameer",
        doctorSpec: "Skin Specialist"
      },
      {
        name: "Citizens Hospitals (Nallagandla)",
        specialty: "Multispecialty, Dermatology, Cardiology",
        address: "Nallagandla, Hyderabad, Telangana 500019",
        phone: "+914067944444",
        rating: "4.3",
        doctor: "Dr. Anika",
        doctorSpec: "Dermatologist"
      }
    ],
    chennai: [
      {
        name: "Apollo Hospitals (Greams Road)",
        address: "Greams Road, Chennai, Tamil Nadu 600006",
        phone: "+914428290202",
        rating: "4.5",
        doctor: "Dr. Arun",
        doctorSpec: "Dermatologist"
      },
      {
        name: "MIOT International",
        address: "Manapakkam, Chennai, Tamil Nadu 600089",
        phone: "+914422008888",
        rating: "4.4",
        doctor: "Dr. Meenakshi",
        doctorSpec: "Skin Specialist"
      },
      {
        name: "Fortis Malar Hospital",
        address: "Adyar, Chennai, Tamil Nadu 600020",
        phone: "+914424999999",
        rating: "4.2",
        doctor: "Dr. Karthik",
        doctorSpec: "Dermatologist"
      }
    ],
    delhi: [
      {
        name: "AIIMS",
        address: "Sri Aurobindo Marg, New Delhi, Delhi 110029",
        phone: "+911126586500",
        rating: "4.5",
        doctor: "Dr. Rahul",
        doctorSpec: "Dermatologist"
      },
      {
        name: "Fortis Escorts Heart Institute",
        address: "Okhla Road, New Delhi, Delhi 110025",
        phone: "+911147168888",
        rating: "4.4",
        doctor: "Dr. Neeraj",
        doctorSpec: "Skin Specialist"
      }
    ],
    mumbai: [
      {
        name: "Kokilaben Dhirubhai Ambani Hospital",
        address: "Andheri West, Mumbai, Maharashtra 400053",
        phone: "+912230914000",
        rating: "4.5",
        doctor: "Dr. Isha",
        doctorSpec: "Dermatologist"
      },
      {
        name: "Lilavati Hospital",
        address: "Bandra West, Mumbai, Maharashtra 400050",
        phone: "+912226747000",
        rating: "4.3",
        doctor: "Dr. Kavya",
        doctorSpec: "Skin Specialist"
      }
    ],
    bengaluru: [
      {
        name: "Manipal Hospital (Old Airport Road)",
        address: "Old Airport Road, Bengaluru, Karnataka 560017",
        phone: "+918025025000",
        rating: "4.4",
        doctor: "Dr. Varun",
        doctorSpec: "Dermatologist"
      },
      {
        name: "Fortis Hospital (Bannerghatta Road)",
        address: "Bannerghatta Road, Bengaluru, Karnataka 560076",
        phone: "+918066225000",
        rating: "4.3",
        doctor: "Dr. Sneha",
        doctorSpec: "Skin Specialist"
      }
    ]
  };

  const normalizeCity = (value) => value.trim().toLowerCase();

  const getHospitalsForCity = (value) => {
    const key = normalizeCity(value);
    if (hospitalData[key]) return hospitalData[key];
    const keys = Object.keys(hospitalData);
    const match = keys.find((city) => key.includes(city));
    return match ? hospitalData[match] : [];
  };

  const renderHospitalCard = (hospital) => {
    const phoneText = formatPhone(hospital.phone);
    const callHref = hospital.phone ? `tel:${hospital.phone}` : "tel:";
    const callClass = hospital.phone ? "btn-red" : "btn-red is-disabled";
    return `
      <div class="hospital-card">
        <div class="hospital-body">
          <h3>${hospital.name}</h3>
          <p>Address: ${hospital.address}</p>
          <p>Phone: <a href="${callHref}">${phoneText}</a></p>
          ${hospital.rating ? `<p>Rating: ${hospital.rating} ★</p>` : ""}
        </div>
        <div class="hospital-actions">
          <a class="${callClass}" href="${callHref}">Call</a>
          <button class="btn-green" onclick="openDoctorPage('${escapeJs(hospital.doctor)}', '${escapeJs(hospital.doctorSpec)}')">
  Book Appointment
</button>
        </div>
      </div>
    `;
  };

  const renderHospitals = (hospitals) => {
    if (!hospitals.length) {
      hospitalPage1.innerHTML = `
        <div class="hospital-card">
          <div class="hospital-body">
            <h3>Hospital data not available for this city</h3>
            <p>Try another city or area.</p>
          </div>
        </div>
      `;
      hospitalPage2.innerHTML = "";
      if (page2Btn) page2Btn.style.display = "none";
      if (page1Btn) page1Btn.style.display = "none";
      return;
    }

    const pages = [];
    for (let i = 0; i < hospitals.length; i += PAGE_SIZE) {
      pages.push(hospitals.slice(i, i + PAGE_SIZE));
    }

    const renderPage = (pageIndex) => {
      hospitalPage1.style.display = pageIndex === 0 ? "flex" : "none";
      hospitalPage2.style.display = pageIndex === 1 ? "flex" : "none";
      hospitalPage1.innerHTML = pages[0].map(renderHospitalCard).join("");
      hospitalPage2.innerHTML = (pages[1] || []).map(renderHospitalCard).join("");
      if (page1Btn && page2Btn) {
        page1Btn.style.background = pageIndex === 0 ? "linear-gradient(135deg, #2563eb, #3b82f6)" : "#64748b";
        page1Btn.style.color = "#fff";
        page2Btn.style.background = pageIndex === 1 ? "linear-gradient(135deg, #2563eb, #3b82f6)" : "#64748b";
        page2Btn.style.color = "#fff";
      }
    };

    if (page1Btn) page1Btn.style.display = "inline-flex";
    if (page2Btn) page2Btn.style.display = pages.length > 1 ? "inline-flex" : "none";

    if (page1Btn) page1Btn.onclick = () => renderPage(0);
    if (page2Btn) page2Btn.onclick = () => renderPage(1);

    renderPage(0);
  };

  const updateMapAndHospitals = (query) => {
    const value = (query || input.value).trim();
    if (!value) return;
    const q = encodeURIComponent(`${value} hospitals`);
    mapFrame.src = `https://www.google.com/maps?q=${q}&output=embed`;
    localStorage.setItem(STORAGE_KEY, value);
    const hospitals = getHospitalsForCity(value);
    renderHospitals(hospitals);
  };

  button.addEventListener("click", () => updateMapAndHospitals());
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      updateMapAndHospitals();
    }
  });

  const saved = localStorage.getItem(STORAGE_KEY);
  const initial = saved || DEFAULT_CITY;
  input.value = initial;
  updateMapAndHospitals(initial);
});
