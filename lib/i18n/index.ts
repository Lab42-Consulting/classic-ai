// Localization system with Serbian as default

export type Locale = "sr" | "en";

export const DEFAULT_LOCALE: Locale = "sr";

export const translations = {
  sr: {
    // Common
    common: {
      loading: "Učitava se...",
      back: "Nazad",
      save: "Sačuvaj",
      cancel: "Otkaži",
      confirm: "Potvrdi",
      error: "Greška",
      success: "Uspešno",
      calories: "kalorija",
      cal: "kal",
    },

    // Greetings
    greetings: {
      morning: "Dobro jutro",
      afternoon: "Dobar dan",
      evening: "Dobro veče",
    },

    // Home page
    home: {
      caloriesLeft: "kalorija preostalo",
      caloriesOver: "kalorija preko cilja",
      consumed: "uneto",
      target: "cilj",
      macroBalance: "Balans makronutrijenata",
      protein: "Proteini",
      carbs: "Ugljeni hidrati",
      fats: "Masti",
      consistency: "doslednost",
      thisWeek: "ove nedelje",
      training: "trening",
      sessions: "treninga",
      glasses: "čaša",
      meals: "obroka",
      noAiSummary: "Nastavi da unosiš podatke da dobiješ AI savete",
      aiInsight: "AI Savet",
      askAi: "Pitaj AI",
      progress: "Napredak",
      checkIn: "Pregled",
      history: "Istorija",
      logSomething: "Unesi podatke",
      membership: "Članarina",
      supplements: "Suplementi",
      changeGoal: "Cilj",
      onTrack: "Sve je u redu",
      needsAttention: "Obrati pažnju",
      offTrack: "Nije dobro",
      surplus: "Višak kalorija",
      surplusWarning: "Prešao si dnevni cilj",
      recoveryOption1: "Sutra umanji unos za",
      recoveryOption2: "ili dodaj ekstra trening",
      recoveryKcal: "kal",
      skipMeal: "Preskoči jedan obrok sutra",
      lightDay: "Sutra budi lakši sa obrocima",
      extraTraining: "Umanji unos ili dodaj trening",
      discussWithAi: "Posavetuj se sa AI trenerom",
      // Contextual prompts
      lowWater: "Hidratacija je ispod cilja",
      lowWaterDesc: "Pij još vode da ostaneš fokusiran i energičan",
      drinkMoreWater: "Saznaj zašto je hidratacija bitna",
      lowProtein: "Proteini su niski",
      lowProteinDesc: "Nedostatak proteina usporava oporavak mišića",
      getProteinAdvice: "Kako da povećam unos proteina?",
      noTrainingYet: "Danas nisi trenirao",
      noTrainingDesc: "Trening pomaže napretku ka tvom cilju",
      askAboutTraining: "Da li treba da treniram danas?",
    },

    // Log page
    log: {
      title: "Unesi podatke",
      iTrained: "Odradio sam trening",
      oneTapLog: "Brzi unos",
      drankWater: "Popio sam vodu",
      plusOneGlass: "+1 čaša",
      iAte: "Jeo sam",
      logMealWithSize: "Unesi obrok sa veličinom",
      logMeal: "Unesi obrok",
      howBigMeal: "Koliki je bio obrok?",
      whatDidYouEat: "Šta si jeo? (nije obavezno)",
      mealPlaceholder: "npr. Piletina i pirinač",
      small: "Mali",
      medium: "Srednji",
      large: "Veliki",
      logged: "Upisano!",
      noCaloryCounting: "Ne moraš da brojiš kalorije — mi računamo umesto tebe.",
      tapToLog: "Pritisni bilo koju opciju za brzi unos.",
    },

    // Check-in page
    checkin: {
      title: "Nedeljni pregled",
      subtitle: "Brza provera tvog napretka",
      currentWeight: "Trenutna težina",
      howFeeling: "Kako se osećaš?",
      complete: "Završi pregled",
      completed: "Pregled završen!",
      greatJob: "Svaka čast na upornosti.",
      alreadyCheckedIn: "Već si popunio pregled",
      alreadyCheckedInDesc: "Već si završio nedeljni pregled. Vrati se sledeće nedelje!",
      backToHome: "Nazad na početnu",
      weeklyHelp: "Nedeljni pregledi nam pomažu da pratimo tvoj napredak i prilagodimo preporuke za tebe.",
      feelings: {
        notGreat: "Loše",
        okay: "Tako-tako",
        good: "Dobro",
        great: "Odlično",
      },
    },

    // Chat page
    chat: {
      title: "AI Trener",
      howCanIHelp: "Kako mogu da ti pomognem?",
      askAbout: "Pitaj me o napretku, ishrani ili treningu",
      suggestedQuestions: "Predložena pitanja",
      askQuestion: "Postavi pitanje...",
      disclaimer: "AI daje samo opšte savete, ne medicinske. Za zdravstvene odluke se uvek konsultuj sa stručnjacima.",
      errorResponse: "Izvini, nisam uspeo da odgovorim. Pokušaj ponovo.",
      connectionError: "Nema konekcije. Proveri internet vezu.",
      suggestedPrompts: [
        "Kako napredujem ove nedelje?",
        "Na šta treba da se fokusiram?",
        "Da li su mi makronutrijenti u balansu?",
        "Zašto je doslednost bitna?",
      ],
    },

    // Auth
    auth: {
      memberLogin: "Prijava člana",
      staffLogin: "Prijava osoblja",
      memberId: "ID člana",
      staffId: "ID osoblja",
      pin: "PIN",
      enterPin: "Unesi 4-cifreni PIN",
      login: "Prijavi se",
      invalidCredentials: "Pogrešan ID ili PIN",
      scanQr: "Skeniraj QR kod",
    },

    // Staff
    staff: {
      dashboard: "Kontrolna tabla",
      members: "Članovi",
      registerMember: "Registruj novog člana",
      totalMembers: "Ukupno članova",
      active: "Aktivni",
      slipping: "Posustaju",
      inactive: "Neaktivni",
      memberDetails: "Detalji člana",
      addNote: "Dodaj napomenu",
      sendMessage: "Pošalji poruku",
    },

    // Subscription
    subscription: {
      title: "Članarina",
      trialPeriod: "Probni period",
      trialDaysLeft: "dana preostalo",
      trialExpired: "Probni period je istekao",
      subscriptionActive: "Aktivna članarina",
      subscriptionExpired: "Članarina je istekla",
      validUntil: "Važi do",
      expired: "Istekla",
      contactGym: "Kontaktiraj teretanu za aktivaciju",
      renewAtGym: "Obnovi članarinu u teretani",
      status: {
        trial: "Probni period",
        active: "Aktivna",
        expired: "Istekla",
        cancelled: "Otkazana",
      },
      benefits: "Šta dobijate",
      benefitsList: [
        "Neograničen pristup AI treneru",
        "Praćenje ishrane i treninga",
        "Nedeljni pregledi napretka",
        "Personalizovani saveti",
        "Predlozi suplemenata",
      ],
    },

    // Supplements
    supplements: {
      title: "Suplementi",
      subtitle: "Preporučeno za tvoj cilj",
      recommended: "Preporučeno",
      optional: "Opciono",
      timing: "Kada uzeti",
      dosage: "Doza",
      benefits: "Prednosti",
      notes: "Napomena",
      disclaimer: "Ovi saveti su opšte prirode. Konsultuj se sa lekarom pre upotrebe bilo kog suplementa.",
      categories: {
        essential: "Osnovni",
        performance: "Performanse",
        recovery: "Oporavak",
        health: "Zdravlje",
      },
      goals: {
        fat_loss: "Gubitak masnoće",
        muscle_gain: "Rast mišića",
        recomposition: "Rekompozicija",
      },
    },

    // Meals
    meals: {
      title: "Obroci",
      myMeals: "Moji obroci",
      sharedMeals: "Podeljeni obroci",
      newMeal: "Novi obrok",
      editMeal: "Izmeni obrok",
      deleteMeal: "Obriši obrok",
      mealName: "Naziv obroka",
      ingredients: "Sastojci",
      addIngredient: "Dodaj sastojak",
      fromLibrary: "Iz biblioteke",
      total: "Ukupno",
      manualTotal: "Ručno podesi",
      shareWithGym: "Podeli sa teretanom",
      sharedWithGym: "Podeljeno sa teretanom",
      sharedBy: "Podelio/la",
      saveMeal: "Sačuvaj obrok",
      savedMeals: "Sačuvani obroci",
      noMeals: "Nemaš sačuvanih obroka",
      noSharedMeals: "Nema podeljenih obroka",
      logThis: "Unesi ovaj obrok",
      copyToSaved: "Sačuvaj u svoje obroke",
      options: "Opcije",
      nameRequired: "Naziv obroka je obavezan",
      needIngredients: "Dodaj bar jedan sastojak sa kalorijama",
      saveError: "Greška prilikom čuvanja",
      deleteConfirmTitle: "Obriši obrok?",
      deleteConfirmMessage: "Ova akcija se ne može poništiti.",
      // Photo translations
      photo: "Slika obroka",
      addPhoto: "Dodaj sliku",
      changePhoto: "Promeni sliku",
      removePhoto: "Ukloni sliku",
      photoRequired: "Slika je obavezna za deljenje obroka",
      photoRequiredHint: "Slika je obavezna za deljenje sa teretanom",
    },

    // Ingredients
    ingredients: {
      title: "Biblioteka sastojaka",
      name: "Naziv",
      portion: "Porcija",
      amount: "Kol.",
      calories: "Kalorije",
      protein: "Proteini (g)",
      carbs: "UH (g)",
      fats: "Masti (g)",
      aiDeduce: "AI popuni",
      aiDeducing: "AI računa...",
      aiError: "Greška prilikom AI dedukcije",
      saveToLibrary: "Sačuvaj u biblioteku",
      noIngredients: "Nema sačuvanih sastojaka",
      addMacros: "Dodaj makrose",
      hideMacros: "Sakrij makrose",
      searchPlaceholder: "Pretraži sastojke...",
      noResults: "Nema rezultata",
      newIngredient: "Novi sastojak",
      editIngredient: "Izmeni sastojak",
      deleteIngredient: "Obriši sastojak",
      defaultPortion: "Podrazumevana porcija",
      deleteConfirmTitle: "Obriši sastojak?",
      deleteConfirmMessage: "Ova akcija se ne može poništiti.",
    },

    // AI Agents
    agents: {
      title: "AI Asistenti",
      selectAgent: "Izaberi oblast za razgovor",
      disclaimer: "AI asistenti daju opšte savete. Za zdravstvene odluke konsultuj stručnjake.",
      nutrition: {
        name: "Ishrana",
        subtitle: "Nutricionista AI",
        description: "Kalorije, obroci, makronutrijenti, preporuke za hranu",
        askButton: "Pitaj Agenta",
        suggestedPrompts: [
          "Koliko kalorija treba da unosim dnevno?",
          "Šta da jedem posle treninga?",
          "Kako da povećam unos proteina?",
          "Da li su mi makrosi u balansu?",
        ],
      },
      supplements: {
        name: "Suplementi",
        subtitle: "Stručnjak za suplemente",
        description: "Dodaci ishrani, doziranje, vreme uzimanja",
        askButton: "Pitaj Agenta",
        suggestedPrompts: [
          "Da li mi treba protein shake?",
          "Kada i kako da uzimam kreatin?",
          "Koji suplementi su bitni za moj cilj?",
          "Da li su pre-workout suplementi bezbedni?",
        ],
      },
      training: {
        name: "Trening",
        subtitle: "Trener AI",
        description: "Vežbe, tehnika, program, oporavak",
        askButton: "Pitaj Agenta",
        suggestedPrompts: [
          "Koliko često treba da treniram?",
          "Kako pravilno da radim čučanj?",
          "Da li treba da treniram danas ili da se odmorim?",
          "Kako da poboljšam bench press?",
        ],
      },
    },

    // Coaches
    coaches: {
      title: "Treneri",
      subtitle: "Izaberi trenera koji će te voditi",
      noCoaches: "Nema dostupnih trenera",
      requestCoach: "Pošalji zahtev",
      requestSent: "Zahtev poslat",
      pendingRequest: "Čeka se odgovor trenera",
      currentCoach: "Tvoj trener",
      yourCoachDescription: "Tvoj trener te vodi ka cilju",
      membersCount: "članova",
      sendRequest: "Pošalji zahtev",
      firstName: "Ime",
      lastName: "Prezime",
      phone: "Broj telefona",
      message: "Poruka (opciono)",
      messagePlaceholder: "Napiši nešto o sebi i svojim ciljevima...",
      requestSuccess: "Zahtev uspešno poslat!",
      waitingForCoach: "Trener će pregledati tvoj zahtev",
      firstNameRequired: "Ime je obavezno",
      lastNameRequired: "Prezime je obavezno",
      phoneRequired: "Broj telefona je obavezan",
    },
  },

  en: {
    // Common
    common: {
      loading: "Loading...",
      back: "Back",
      save: "Save",
      cancel: "Cancel",
      confirm: "Confirm",
      error: "Error",
      success: "Success",
      calories: "calories",
      cal: "cal",
    },

    // Greetings
    greetings: {
      morning: "Good morning",
      afternoon: "Good afternoon",
      evening: "Good evening",
    },

    // Home page
    home: {
      caloriesLeft: "calories left",
      caloriesOver: "calories over goal",
      consumed: "consumed",
      target: "target",
      macroBalance: "Macro Balance",
      protein: "Protein",
      carbs: "Carbs",
      fats: "Fats",
      consistency: "consistency",
      thisWeek: "this week",
      training: "training",
      sessions: "sessions",
      glasses: "glasses",
      meals: "meals",
      noAiSummary: "Keep logging to get AI insights",
      aiInsight: "AI Insight",
      askAi: "Ask AI",
      progress: "Progress",
      checkIn: "Check-in",
      history: "History",
      logSomething: "Log Something",
      membership: "Membership",
      supplements: "Supplements",
      changeGoal: "Goal",
      onTrack: "On Track",
      needsAttention: "Needs Attention",
      offTrack: "Off Track",
      surplus: "Calorie Surplus",
      surplusWarning: "You've exceeded your daily goal",
      recoveryOption1: "Reduce intake by",
      recoveryOption2: "or add extra training",
      recoveryKcal: "cal",
      skipMeal: "Skip one meal tomorrow",
      lightDay: "Have lighter meals tomorrow",
      extraTraining: "Reduce intake or add training",
      discussWithAi: "Ask AI trainer for advice",
      // Contextual prompts
      lowWater: "Hydration is below target",
      lowWaterDesc: "Drink more water to stay focused and energized",
      drinkMoreWater: "Learn why hydration matters",
      lowProtein: "Protein is low",
      lowProteinDesc: "Low protein slows down muscle recovery",
      getProteinAdvice: "How can I increase my protein intake?",
      noTrainingYet: "No training today",
      noTrainingDesc: "Training helps you reach your goals",
      askAboutTraining: "Should I train today?",
    },

    // Log page
    log: {
      title: "Log Something",
      iTrained: "I trained",
      oneTapLog: "One-tap log",
      drankWater: "Drank water",
      plusOneGlass: "+1 glass",
      iAte: "I ate",
      logMealWithSize: "Log a meal with size",
      logMeal: "Log meal",
      howBigMeal: "How big was your meal?",
      whatDidYouEat: "What did you eat? (optional)",
      mealPlaceholder: "e.g., Chicken and rice",
      small: "Small",
      medium: "Medium",
      large: "Large",
      logged: "Logged!",
      noCaloryCounting: "No need to count calories — we estimate for you.",
      tapToLog: "Tap any option to log quickly.",
    },

    // Check-in page
    checkin: {
      title: "Weekly Check-In",
      subtitle: "A quick check to track your progress",
      currentWeight: "Current weight",
      howFeeling: "How are you feeling?",
      complete: "Complete Check-In",
      completed: "Check-in complete!",
      greatJob: "Great job staying consistent.",
      alreadyCheckedIn: "Already checked in",
      alreadyCheckedInDesc: "You've already completed your weekly check-in. Come back next week!",
      backToHome: "Back to Home",
      weeklyHelp: "Weekly check-ins help us track your progress and adjust recommendations for you.",
      feelings: {
        notGreat: "Not great",
        okay: "Okay",
        good: "Good",
        great: "Great",
      },
    },

    // Chat page
    chat: {
      title: "AI Coach",
      howCanIHelp: "How can I help?",
      askAbout: "Ask me about your progress, nutrition, or training",
      suggestedQuestions: "Suggested questions",
      askQuestion: "Ask a question...",
      disclaimer: "AI provides general guidance only, not medical advice. Always consult professionals for health decisions.",
      errorResponse: "Sorry, I couldn't respond right now. Please try again.",
      connectionError: "Unable to connect. Please check your connection.",
      suggestedPrompts: [
        "How am I doing this week?",
        "What should I focus on?",
        "Is my macro balance okay?",
        "Why is consistency important?",
      ],
    },

    // Auth
    auth: {
      memberLogin: "Member Login",
      staffLogin: "Staff Login",
      memberId: "Member ID",
      staffId: "Staff ID",
      pin: "PIN",
      enterPin: "Enter 4-digit PIN",
      login: "Log in",
      invalidCredentials: "Invalid ID or PIN",
      scanQr: "Scan QR Code",
    },

    // Staff
    staff: {
      dashboard: "Dashboard",
      members: "Members",
      registerMember: "Register New Member",
      totalMembers: "Total Members",
      active: "Active",
      slipping: "Slipping",
      inactive: "Inactive",
      memberDetails: "Member Details",
      addNote: "Add Note",
      sendMessage: "Send Message",
    },

    // Subscription
    subscription: {
      title: "Membership",
      trialPeriod: "Trial Period",
      trialDaysLeft: "days left",
      trialExpired: "Trial period has expired",
      subscriptionActive: "Active Subscription",
      subscriptionExpired: "Subscription Expired",
      validUntil: "Valid until",
      expired: "Expired",
      contactGym: "Contact gym for activation",
      renewAtGym: "Renew membership at the gym",
      status: {
        trial: "Trial",
        active: "Active",
        expired: "Expired",
        cancelled: "Cancelled",
      },
      benefits: "What you get",
      benefitsList: [
        "Unlimited AI trainer access",
        "Nutrition and training tracking",
        "Weekly progress reviews",
        "Personalized advice",
        "Supplement suggestions",
      ],
    },

    // Supplements
    supplements: {
      title: "Supplements",
      subtitle: "Recommended for your goal",
      recommended: "Recommended",
      optional: "Optional",
      timing: "When to take",
      dosage: "Dosage",
      benefits: "Benefits",
      notes: "Note",
      disclaimer: "These are general suggestions. Consult a doctor before using any supplements.",
      categories: {
        essential: "Essential",
        performance: "Performance",
        recovery: "Recovery",
        health: "Health",
      },
      goals: {
        fat_loss: "Fat Loss",
        muscle_gain: "Muscle Gain",
        recomposition: "Recomposition",
      },
    },

    // Meals
    meals: {
      title: "Meals",
      myMeals: "My Meals",
      sharedMeals: "Shared Meals",
      newMeal: "New Meal",
      editMeal: "Edit Meal",
      deleteMeal: "Delete Meal",
      mealName: "Meal Name",
      ingredients: "Ingredients",
      addIngredient: "Add Ingredient",
      fromLibrary: "From Library",
      total: "Total",
      manualTotal: "Set Manually",
      shareWithGym: "Share with Gym",
      sharedWithGym: "Shared with Gym",
      sharedBy: "Shared by",
      saveMeal: "Save Meal",
      savedMeals: "Saved Meals",
      noMeals: "No saved meals",
      noSharedMeals: "No shared meals",
      logThis: "Log this meal",
      copyToSaved: "Save to your meals",
      options: "Options",
      nameRequired: "Meal name is required",
      needIngredients: "Add at least one ingredient with calories",
      saveError: "Error saving meal",
      deleteConfirmTitle: "Delete meal?",
      deleteConfirmMessage: "This action cannot be undone.",
      // Photo translations
      photo: "Meal Photo",
      addPhoto: "Add Photo",
      changePhoto: "Change Photo",
      removePhoto: "Remove Photo",
      photoRequired: "Photo is required when sharing a meal",
      photoRequiredHint: "Photo is required for sharing with gym",
    },

    // Ingredients
    ingredients: {
      title: "Ingredient Library",
      name: "Name",
      portion: "Portion",
      amount: "Amt.",
      calories: "Calories",
      protein: "Protein (g)",
      carbs: "Carbs (g)",
      fats: "Fats (g)",
      aiDeduce: "AI Fill",
      aiDeducing: "AI calculating...",
      aiError: "AI deduction error",
      saveToLibrary: "Save to Library",
      noIngredients: "No saved ingredients",
      addMacros: "Add macros",
      hideMacros: "Hide macros",
      searchPlaceholder: "Search ingredients...",
      noResults: "No results",
      newIngredient: "New Ingredient",
      editIngredient: "Edit Ingredient",
      deleteIngredient: "Delete Ingredient",
      defaultPortion: "Default Portion",
      deleteConfirmTitle: "Delete ingredient?",
      deleteConfirmMessage: "This action cannot be undone.",
    },

    // AI Agents
    agents: {
      title: "AI Assistants",
      selectAgent: "Choose a topic to discuss",
      disclaimer: "AI assistants provide general advice. Consult professionals for health decisions.",
      nutrition: {
        name: "Nutrition",
        subtitle: "Nutrition AI",
        description: "Calories, meals, macros, food recommendations",
        askButton: "Ask Agent",
        suggestedPrompts: [
          "How many calories should I eat daily?",
          "What should I eat after training?",
          "How can I increase my protein intake?",
          "Is my macro balance okay?",
        ],
      },
      supplements: {
        name: "Supplements",
        subtitle: "Supplements Expert",
        description: "Dietary supplements, dosing, timing",
        askButton: "Ask Agent",
        suggestedPrompts: [
          "Do I need a protein shake?",
          "When and how should I take creatine?",
          "What supplements are important for my goal?",
          "Are pre-workout supplements safe?",
        ],
      },
      training: {
        name: "Training",
        subtitle: "Training AI",
        description: "Exercises, technique, program, recovery",
        askButton: "Ask Agent",
        suggestedPrompts: [
          "How often should I train?",
          "How to do a proper squat?",
          "Should I train today or rest?",
          "How can I improve my bench press?",
        ],
      },
    },

    // Coaches
    coaches: {
      title: "Coaches",
      subtitle: "Choose a coach to guide you",
      noCoaches: "No coaches available",
      requestCoach: "Send Request",
      requestSent: "Request Sent",
      pendingRequest: "Waiting for coach response",
      currentCoach: "Your Coach",
      yourCoachDescription: "Your coach is guiding you to your goal",
      membersCount: "members",
      sendRequest: "Send Request",
      firstName: "First Name",
      lastName: "Last Name",
      phone: "Phone Number",
      message: "Message (optional)",
      messagePlaceholder: "Tell me about yourself and your goals...",
      requestSuccess: "Request sent successfully!",
      waitingForCoach: "Coach will review your request",
      firstNameRequired: "First name is required",
      lastNameRequired: "Last name is required",
      phoneRequired: "Phone number is required",
    },
  },
} as const;

// Translation type based on structure (not literal values)
export type TranslationKeys = {
  common: {
    loading: string;
    back: string;
    save: string;
    cancel: string;
    confirm: string;
    error: string;
    success: string;
    calories: string;
    cal: string;
  };
  greetings: {
    morning: string;
    afternoon: string;
    evening: string;
  };
  home: {
    caloriesLeft: string;
    caloriesOver: string;
    consumed: string;
    target: string;
    macroBalance: string;
    protein: string;
    carbs: string;
    fats: string;
    consistency: string;
    thisWeek: string;
    training: string;
    sessions: string;
    glasses: string;
    meals: string;
    noAiSummary: string;
    aiInsight: string;
    askAi: string;
    progress: string;
    checkIn: string;
    history: string;
    logSomething: string;
    membership: string;
    supplements: string;
    changeGoal: string;
    onTrack: string;
    needsAttention: string;
    offTrack: string;
    surplus: string;
    surplusWarning: string;
    recoveryOption1: string;
    recoveryOption2: string;
    recoveryKcal: string;
    skipMeal: string;
    lightDay: string;
    extraTraining: string;
    discussWithAi: string;
    // Contextual prompts
    lowWater: string;
    lowWaterDesc: string;
    drinkMoreWater: string;
    lowProtein: string;
    lowProteinDesc: string;
    getProteinAdvice: string;
    noTrainingYet: string;
    noTrainingDesc: string;
    askAboutTraining: string;
  };
  log: {
    title: string;
    iTrained: string;
    oneTapLog: string;
    drankWater: string;
    plusOneGlass: string;
    iAte: string;
    logMealWithSize: string;
    logMeal: string;
    howBigMeal: string;
    whatDidYouEat: string;
    mealPlaceholder: string;
    small: string;
    medium: string;
    large: string;
    logged: string;
    noCaloryCounting: string;
    tapToLog: string;
  };
  checkin: {
    title: string;
    subtitle: string;
    currentWeight: string;
    howFeeling: string;
    complete: string;
    completed: string;
    greatJob: string;
    alreadyCheckedIn: string;
    alreadyCheckedInDesc: string;
    backToHome: string;
    weeklyHelp: string;
    feelings: {
      notGreat: string;
      okay: string;
      good: string;
      great: string;
    };
  };
  chat: {
    title: string;
    howCanIHelp: string;
    askAbout: string;
    suggestedQuestions: string;
    askQuestion: string;
    disclaimer: string;
    errorResponse: string;
    connectionError: string;
    suggestedPrompts: readonly string[];
  };
  auth: {
    memberLogin: string;
    staffLogin: string;
    memberId: string;
    staffId: string;
    pin: string;
    enterPin: string;
    login: string;
    invalidCredentials: string;
    scanQr: string;
  };
  staff: {
    dashboard: string;
    members: string;
    registerMember: string;
    totalMembers: string;
    active: string;
    slipping: string;
    inactive: string;
    memberDetails: string;
    addNote: string;
    sendMessage: string;
  };
  subscription: {
    title: string;
    trialPeriod: string;
    trialDaysLeft: string;
    trialExpired: string;
    subscriptionActive: string;
    subscriptionExpired: string;
    validUntil: string;
    expired: string;
    contactGym: string;
    renewAtGym: string;
    status: {
      trial: string;
      active: string;
      expired: string;
      cancelled: string;
    };
    benefits: string;
    benefitsList: readonly string[];
  };
  supplements: {
    title: string;
    subtitle: string;
    recommended: string;
    optional: string;
    timing: string;
    dosage: string;
    benefits: string;
    notes: string;
    disclaimer: string;
    categories: {
      essential: string;
      performance: string;
      recovery: string;
      health: string;
    };
    goals: {
      fat_loss: string;
      muscle_gain: string;
      recomposition: string;
    };
  };
  meals: {
    title: string;
    myMeals: string;
    sharedMeals: string;
    newMeal: string;
    editMeal: string;
    deleteMeal: string;
    mealName: string;
    ingredients: string;
    addIngredient: string;
    fromLibrary: string;
    total: string;
    manualTotal: string;
    shareWithGym: string;
    sharedWithGym: string;
    sharedBy: string;
    saveMeal: string;
    savedMeals: string;
    noMeals: string;
    noSharedMeals: string;
    logThis: string;
    copyToSaved: string;
    options: string;
    nameRequired: string;
    needIngredients: string;
    saveError: string;
    deleteConfirmTitle: string;
    deleteConfirmMessage: string;
    // Photo translations
    photo?: string;
    addPhoto?: string;
    changePhoto?: string;
    removePhoto?: string;
    photoRequired?: string;
    photoRequiredHint?: string;
  };
  ingredients: {
    title: string;
    name: string;
    portion: string;
    amount: string;
    calories: string;
    protein: string;
    carbs: string;
    fats: string;
    aiDeduce: string;
    aiDeducing: string;
    aiError: string;
    saveToLibrary: string;
    noIngredients: string;
    addMacros: string;
    hideMacros: string;
    searchPlaceholder: string;
    noResults: string;
    newIngredient: string;
    editIngredient: string;
    deleteIngredient: string;
    defaultPortion: string;
    deleteConfirmTitle: string;
    deleteConfirmMessage: string;
  };
  agents: {
    title: string;
    selectAgent: string;
    disclaimer: string;
    nutrition: {
      name: string;
      subtitle: string;
      description: string;
      askButton: string;
      suggestedPrompts: readonly string[];
    };
    supplements: {
      name: string;
      subtitle: string;
      description: string;
      askButton: string;
      suggestedPrompts: readonly string[];
    };
    training: {
      name: string;
      subtitle: string;
      description: string;
      askButton: string;
      suggestedPrompts: readonly string[];
    };
  };
  coaches?: {
    title: string;
    subtitle: string;
    noCoaches: string;
    requestCoach: string;
    requestSent: string;
    pendingRequest: string;
    currentCoach: string;
    yourCoachDescription: string;
    membersCount: string;
    sendRequest: string;
    firstName: string;
    lastName: string;
    phone: string;
    message: string;
    messagePlaceholder: string;
    requestSuccess: string;
    waitingForCoach: string;
    firstNameRequired: string;
    lastNameRequired: string;
    phoneRequired: string;
  };
};

// Get translation function
export function getTranslations(locale: Locale = DEFAULT_LOCALE): TranslationKeys {
  return translations[locale] as TranslationKeys;
}

// Hook-like function for components (can be used with React context later)
export function useTranslations(locale: Locale = DEFAULT_LOCALE): TranslationKeys {
  return translations[locale] as TranslationKeys;
}

// Get greeting based on time of day
export function getGreeting(locale: Locale = DEFAULT_LOCALE): string {
  const hour = new Date().getHours();
  const t = translations[locale].greetings;

  if (hour < 12) return t.morning;
  if (hour < 17) return t.afternoon;
  return t.evening;
}
