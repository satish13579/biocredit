import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Principal "mo:base/Principal";
import RBTree "mo:base/RBTree";
import Float "mo:base/Float";
import Time "mo:base/Time";
import Blob "mo:base/Blob";
import Text "mo:base/Text";
import List "mo:base/List";
import Iter "mo:base/Iter";
import Array "mo:base/Array";
import Buffer "mo:base/Buffer";
import LocalDateTime "mo:datetime/LocalDateTime";

actor {

  type Role = {
    #NormalUser;
    #SuperUser;
  };

  type Location = (Float, Float, Float);

  type basicResponse = {
    statusCode : Nat;
    msg : Text;
  };

  type registerResponse = {
    statusCode : Nat;
    role : ?Role;
  };

  type readingsResponse = {
    statusCode : Nat;
    msg : Text;
    user : ?User;
    readings : ?Records;
    usernames : ?[{ principal : Principal; username : Text }];
  };

  type User = {
    name : Text;
    role : Role;
    joinedAt : Time.Time;
    address : Text;
    location : Location;
  };

  type ReadingRecord = {
    userPrincipal : Principal;
    timeStamp : Time.Time;
    date : Text;
    meterReading : Float;
    meterImage : Blob;
    submittedBy : Principal;
    location : Location;
  };

  public type Records = [ReadingRecord];

  public type UserList = [Principal];

  let indianTimezone : LocalDateTime.TimeZone = #fixed(#seconds(19800));
  var users = RBTree.RBTree<Principal, User>(Principal.compare);
  var readings = RBTree.RBTree<Principal, Records>(Principal.compare);
  var dayWiseListings = RBTree.RBTree<Text, UserList>(Text.compare);

  private func getDate() : Text {
    let dateTime : LocalDateTime.LocalDateTime = LocalDateTime.now(indianTimezone);
    let dateTimeText : Text = LocalDateTime.toTextFormatted(dateTime, #custom({ format = "YYYY-MM-DD"; locale = null }));
    return dateTimeText;
  };

  private func degreesToRadians(degrees : Float) : Float {
    return degrees * Float.pi / 180.0;
  };

  private func calcDistance(lat1 : Float, lon1 : Float, lat2 : Float, lon2 : Float) : Float {
    // Get the Earth radius in kilometers
    let earthRadiusKm : Float = 6371.0;

    // Convert the latitude and longitude coordinates to radians
    let dLat = degreesToRadians(lat2 - lat1);
    let dLon = degreesToRadians(lon2 - lon1);

    // Calculate the sine and cosine of the latitude coordinates
    let lat1Rad = degreesToRadians(lat1);
    let lat2Rad = degreesToRadians(lat2);

    // Calculate the Haversine formula
    let a = Float.sin(dLat / 2.0) * Float.sin(dLat / 2.0) + Float.sin(dLon / 2.0) * Float.sin(dLon / 2.0) * Float.cos(lat1Rad) * Float.cos(lat2Rad);
    let c = 2.0 * Float.arctan2(Float.sqrt(a), Float.sqrt(1.0 - a));

    // Calculate and return the distance in meters
    return earthRadiusKm * c * 1000.0;
  };

  // function to check whether caller has a account or not
  public shared query (msg) func isAccountExists() : async {
    statusCode : Nat;
    role : ?Role;
    msg : Text;
  } {
    if (not Principal.isAnonymous(msg.caller)) {
      var user = users.get(msg.caller);
      switch (user) {
        case (null) {
          return { statusCode = 200; role = null; msg = "doesntexist" };
        };
        case (?user) {
          return { statusCode = 200; role = ?user.role; msg = "exist" };
        };
      };
    } else {
      return {
        statusCode = 404;
        role = null;
        msg = "Connect Wallet To Access This Function";
      };
    };
  };

  //
  public shared query (msg) func get() : async {
    statusCode : Nat;
    user : ?User;
    principal : ?Principal;
  } {
    if (not Principal.isAnonymous(msg.caller)) {
      var user = users.get(msg.caller);
      switch (user) {
        case (null) {
          return { statusCode = 200; user = null; principal = null };
        };
        case (?user) {
          return { statusCode = 200; user = ?user; principal = ?msg.caller };
        };
      };
    } else {
      return {
        statusCode = 404;
        user = null;
        principal = null;
      };
    };
  };

  // function to create a account
  public shared (msg) func createAccount(name : Text, role : Role, address : Text, latitude : Float, longitude : Float, accuracy : Float) : async registerResponse {
    if (not Principal.isAnonymous(msg.caller)) {
      var user = users.get(msg.caller);
      switch (user) {
        case (null) {
          var user : User = {
            name = name;
            role = role;
            joinedAt = Time.now();
            address = address;
            location = (latitude, longitude, accuracy);
          };
          users.put(msg.caller, user);
          var initialReadings : Records = [];
          readings.put(msg.caller, initialReadings);
          return { statusCode = 200; role = ?role };
        };
        case (?user) {
          return { statusCode = 400; role = ?user.role };
        };
      };
    } else {
      return { statusCode = 404; role = null };
    };
  };

  public shared query (msg) func checkReadingAvailability() : async {
    statusCode : Nat;
    availability : ?Bool;
    dropdownUsers : ?[{ principal : Principal; name : Text }];
  } {
    if (not Principal.isAnonymous(msg.caller)) {
      var user = users.get(msg.caller);
      switch (user) {
        case (null) {
          return { statusCode = 403; availability = null; dropdownUsers = null };
        };
        case (?user) {
          var today : Text = getDate();
          var todayListings = dayWiseListings.get(today);
          if (user.role == #NormalUser) {
            switch (todayListings) {
              case (null) {
                return {
                  statusCode = 200;
                  availability = ?true;
                  dropdownUsers = null;
                };
              };
              case (?todayListings) {
                var mapp = Array.filter<Principal>(todayListings, func x = x == msg.caller);
                var noofmapp = Array.size<Principal>(mapp);
                if (noofmapp == 0) {
                  return {
                    statusCode = 200;
                    availability = ?true;
                    dropdownUsers = null;
                  };
                } else {
                  return {
                    statusCode = 200;
                    availability = ?false;
                    dropdownUsers = null;
                  };
                };
              };
            };
          } else {
            var dropdownUsers = Buffer.Buffer<{ principal : Principal; name : Text }>(RBTree.size(users.share()));
            switch (todayListings) {
              case (null) {
                for (entry in RBTree.iter(users.share(), #bwd)) {
                  var new = { principal = entry.0; name = entry.1.name };
                  dropdownUsers.add(new);
                };
                return {
                  statusCode = 200;
                  availability = ?true;
                  dropdownUsers = ?Buffer.toArray(dropdownUsers);
                };
              };
              case (?todayListings) {
                for (entry in RBTree.iter(users.share(), #bwd)) {
                  var mapp = Array.filter<Principal>(todayListings, func x = x == entry.0);
                  var noofmapp = Array.size<Principal>(mapp);
                  if (noofmapp == 0) {
                    var new = { principal = entry.0; name = entry.1.name };
                    dropdownUsers.add(new);
                  };
                };
                var noofusers = dropdownUsers.size();
                if (noofusers > 0) {
                  return {
                    statusCode = 200;
                    availability = ?true;
                    dropdownUsers = ?Buffer.toArray(dropdownUsers);
                  };
                } else {
                  return {
                    statusCode = 200;
                    availability = ?false;
                    dropdownUsers = null;
                  };
                };
              };
            };
          };
        };
      };
    } else {
      return { statusCode = 404; availability = null; dropdownUsers = null };
    };
  };

  // function to add a meter reading
  public shared (msg) func addReading(meterReading : Float, meterImage : Blob, location : Location, readingUserPrincipal : ?Principal) : async basicResponse {
    if (not Principal.isAnonymous(msg.caller)) {
      var use : ?User = users.get(msg.caller);
      switch (use) {
        case (null) {
          return {
            statusCode = 403;
            msg = "Create a Account to Access this Method";
          };
        };
        case (?use) {
          if (use.role == #NormalUser) {
            var today : Text = getDate();
            var distance = calcDistance(use.location.0, use.location.1, location.0, location.1);
            if (distance <= use.location.2 + location.2 + 300.0) {
              var previousDayWiseListings = dayWiseListings.get(today);
              var access : Bool = true;
              switch (previousDayWiseListings) {
                case (null) {
                  var newDayWiseListings : UserList = Array.make<Principal>(msg.caller);
                  dayWiseListings.put(today, newDayWiseListings);
                };
                case (?previousDayWiseListings) {
                  var mapp = Array.filter<Principal>(previousDayWiseListings, func x = x == msg.caller);
                  var noofmapp = Array.size<Principal>(mapp);
                  if (noofmapp == 0) {
                    var newDayWiseListings : UserList = Array.append<Principal>(previousDayWiseListings, Array.make<Principal>(msg.caller));
                    dayWiseListings.put(today, newDayWiseListings);
                  } else {
                    access := false;
                  };
                };
              };

              if (access) {
                var record : ReadingRecord = {
                  userPrincipal = msg.caller;
                  timeStamp = Time.now();
                  date = today;
                  meterReading = meterReading;
                  meterImage = meterImage;
                  submittedBy = msg.caller;
                  location = location;
                };

                var previousReadings = readings.get(msg.caller);
                switch (previousReadings) {
                  case (null) {
                    var newReadings : Records = Array.make<ReadingRecord>(record);
                    readings.put(msg.caller, newReadings);
                  };
                  case (?previousReadings) {
                    var newReadings : Records = Array.append<ReadingRecord>(previousReadings, Array.make<ReadingRecord>(record));
                    readings.put(msg.caller, newReadings);
                  };
                };

                return {
                  statusCode = 200;
                  msg = "Meter Reading Updated Successfully";
                };
              } else {
                return {
                  statusCode = 400;
                  msg = "Meter reading Submission Failed,\nAs Todays reading of " # use.name # "'s Meter is already Submitted.!!";
                };
              };
            } else {
              return {
                statusCode = 400;
                msg = "Please Submit the Form While Standing less than 300 meters distance From " # use.name # "'s Meter,\ncurrent Distance is " # Float.toText(distance -use.location.2 -location.2) # ".!!";
              };
            };
          } else {
            var today : Text = getDate();
            switch (readingUserPrincipal) {
              case (null) {
                return {
                  statusCode = 408;
                  msg = "User Principal is a Required Field";
                };
              };
              case (?readingUserPrincipal) {
                var readUser : ?User = users.get(readingUserPrincipal);
                switch (readUser) {
                  case (null) {
                    return {
                      statusCode = 408;
                      msg = "Unknown/Invalid User Account is Selected";
                    };
                  };
                  case (?readUser) {
                    var distance = calcDistance(readUser.location.0, readUser.location.1, location.0, location.1);
                    if (distance <= readUser.location.2 + location.2 + 300.0) {
                      var previousDayWiseListings = dayWiseListings.get(today);
                      var access : Bool = true;
                      switch (previousDayWiseListings) {
                        case (null) {
                          var newDayWiseListings : UserList = Array.make<Principal>(readingUserPrincipal);
                          dayWiseListings.put(today, newDayWiseListings);
                        };
                        case (?previousDayWiseListings) {
                          var mapp = Array.filter<Principal>(previousDayWiseListings, func x = x == readingUserPrincipal);
                          var noofmapp = Array.size<Principal>(mapp);
                          if (noofmapp == 0) {
                            var newDayWiseListings : UserList = Array.append<Principal>(previousDayWiseListings, Array.make<Principal>(readingUserPrincipal));
                            dayWiseListings.put(today, newDayWiseListings);
                          } else {
                            access := false;
                          };
                        };
                      };

                      if (access) {
                        var record : ReadingRecord = {
                          userPrincipal = readingUserPrincipal;
                          timeStamp = Time.now();
                          date = today;
                          meterReading = meterReading;
                          meterImage = meterImage;
                          submittedBy = msg.caller;
                          location = location;
                        };

                        var previousReadings = readings.get(readingUserPrincipal);
                        switch (previousReadings) {
                          case (null) {
                            var newReadings : Records = Array.make<ReadingRecord>(record);
                            readings.put(readingUserPrincipal, newReadings);
                          };
                          case (?previousReadings) {
                            var newReadings : Records = Array.append<ReadingRecord>(previousReadings, Array.make<ReadingRecord>(record));
                            readings.put(readingUserPrincipal, newReadings);
                          };
                        };

                        var previousReadingsOfSuperUser = readings.get(msg.caller);
                        switch (previousReadingsOfSuperUser) {
                          case (null) {
                            var newReadingsOfSuperUser : Records = Array.make<ReadingRecord>(record);
                            readings.put(msg.caller, newReadingsOfSuperUser);
                          };
                          case (?previousReadingsOfSuperUser) {
                            var newReadingsOfSuperUser : Records = Array.append<ReadingRecord>(previousReadingsOfSuperUser, Array.make<ReadingRecord>(record));
                            readings.put(msg.caller, newReadingsOfSuperUser);
                          };
                        };

                        return {
                          statusCode = 200;
                          msg = "Meter Reading Updated Successfully";
                        };
                      } else {
                        return {
                          statusCode = 400;
                          msg = "Meter reading Submission Failed,\nAs Todays reading of " # readUser.name # "'s Meter is already Submitted.!!";
                        };
                      };
                    } else {
                      return {
                        statusCode = 400;
                        msg = "Please Submit the Form While Standing less than 300 meters distance From " # readUser.name # "'s Meter,\ncurrent Distance is " # Float.toText(distance -readUser.location.2 -location.2) # ".!!";
                      };
                    };

                  };
                };
              };
            };
          };
        };
      };
    } else {
      return {
        statusCode = 404;
        msg = "Connect Wallet To Access This Function";
      };
    };
  };

  public shared query (msg) func readReadings(readPrincipal : ?Principal) : async readingsResponse {
    var isAnonymous = Principal.isAnonymous(msg.caller);
    // checks whether case is self readings or qrscan readings
    switch (readPrincipal) {
      // case is self readings
      case (null) {
        // anonymous account in self readings can't possible
        if (isAnonymous) {
          return {
            statusCode = 403;
            msg = "Provide a User Principal to Get Readings";
            user = null;
            readings = null;
            usernames = null;
          };
        } else {
          // check account exits
          var current_user = users.get(msg.caller);
          switch (current_user) {
            case (null) {
              // need to create account
              return {
                statusCode = 403;
                msg = "Create a Account to Access this Method";
                user = null;
                readings = null;
                usernames = null;
              };
            };
            case (?current_user) {
              // collect & send readings
              var user_readings = readings.get(msg.caller);
              var usernames : ?[{ principal : Principal; username : Text }] = null;
              switch (user_readings) {
                case (null) {
                  usernames := null;
                };
                case (?user_readings) {
                  var usernames_buffer = Buffer.Buffer<{ principal : Principal; username : Text }>(RBTree.size(users.share()));
                  for (element in user_readings.vals()) {
                    var username : Text = "null";
                    var user = users.get(element.submittedBy);
                    switch (user) {
                      case (null) {};
                      case (?user) {
                        username := user.name;
                        usernames_buffer.add({
                          principal = element.submittedBy;
                          username = username;
                        });
                      };
                    };
                  };
                  usernames := ?Buffer.toArray(usernames_buffer);
                };
              };
              return {
                statusCode = 200;
                msg = "Readings Retrieved Successfully";
                user = ?current_user;
                readings = user_readings;
                usernames = usernames;
              };
            };
          };
        };
      };
      // case is qr readings
      case (?readPrincipal) {
        var current_user = users.get(readPrincipal);
        switch (current_user) {
          case (null) {
            // given account doesn't exist
            return {
              statusCode = 403;
              msg = "Unknown/Invalid User Account is Given";
              user = null;
              readings = null;
              usernames = null;
            };
          };
          case (?current_user) {
            // collect & send readings
            var user_readings = readings.get(readPrincipal);
            var usernames : ?[{ principal : Principal; username : Text }] = null;
            switch (user_readings) {
              case (null) {
                usernames := null;
              };
              case (?user_readings) {
                var usernames_buffer = Buffer.Buffer<{ principal : Principal; username : Text }>(RBTree.size(users.share()));
                for (element in user_readings.vals()) {
                  var username : Text = "null";
                  var user = users.get(element.submittedBy);
                  switch (user) {
                    case (null) {};
                    case (?user) {
                      username := user.name;
                      usernames_buffer.add({
                        principal = element.submittedBy;
                        username = username;
                      });
                    };
                  };

                };
                usernames := ?Buffer.toArray(usernames_buffer);
              };
            };
            return {
              statusCode = 200;
              msg = "Readings Retrieved Successfully";
              user = ?current_user;
              readings = user_readings;
              usernames = usernames;
            };
          };
        };
      };
    };

  };

  /* Stabling Users Data While Cannister Upgrade */

  type StableUser = (Principal, User); // type to hold stable user

  type StableReadings = (Principal, Records);

  stable var serializedReadings : [StableReadings] = [];

  func serailizeReadings() {
    serializedReadings := Iter.toArray(readings.entries());
  };

  func deserializeReadings() {
    let newReadings = RBTree.RBTree<Principal, Records>(Principal.compare);
    let tuples = Iter.fromArray(serializedReadings);
    for (tuple in tuples) {
      let (key, value) = tuple;
      newReadings.put(key, value);
    };
    readings := newReadings;
  };

  stable var serializedUsers : [StableUser] = []; // stable variable to hold users

  func serailize() {
    // function to store users in stable variable while upgrade
    serializedUsers := Iter.toArray(users.entries());
  };

  func deserialize() {
    // function to store users from stable variable to RBTree after upgrade
    let newUsers = RBTree.RBTree<Principal, User>(Principal.compare);
    let tuples = Iter.fromArray(serializedUsers);
    for (tuple in tuples) {
      let (key, value) = tuple;
      newUsers.put(key, value);
    };
    users := newUsers;
  };

  system func preupgrade() {
    serailize();
    serailizeReadings();
  };

  system func postupgrade() {
    deserialize();
    deserializeReadings();
  };
};
