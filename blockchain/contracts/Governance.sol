// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Governance {
    enum Role { Citizen, Admin, Verifier }
    enum RequestStatus { Pending, Approved, Rejected }

    struct User {
        string name;
        Role role;
        bool isRegistered;
        string emailHash; // Store hash of email for privacy
    }

    struct ServiceRequest {
        uint256 id;
        uint256 serviceId; // e.g., 1 for Birth Cert, 2 for Land Reg
        address applicant;
        string dataHash; // IPFS hash of documents
        RequestStatus status;
        uint256 timestamp;
        string remarks;
    }

    struct Land {
        uint256 id;
        string location;
        uint256 area; // in sq ft
        address owner;
        RequestStatus status;
    }

    struct FundRequest {
        uint256 id;
        string purpose;
        uint256 amount;
        address requester;
        bool approved;
        uint256 timestamp;
    }

    mapping(address => User) public users;
    mapping(uint256 => ServiceRequest) public requests;
    mapping(uint256 => Land) public lands;
    mapping(uint256 => FundRequest) public fundRequests;

    uint256 public requestCount;
    uint256 public landCount;
    uint256 public fundRequestCount;

    event UserRegistered(address indexed userAddress, string name, Role role);
    event RequestCreated(uint256 indexed requestId, address indexed applicant, uint256 serviceId);
    event RequestStatusUpdated(uint256 indexed requestId, RequestStatus status, address indexed verifier);
    event LandRegistered(uint256 indexed landId, string location, address indexed owner);
    event FundRequested(uint256 indexed requestId, string purpose, uint256 amount, address indexed requester);
    event FundApproved(uint256 indexed requestId, address indexed approver);

    modifier onlyRegistered() {
        require(users[msg.sender].isRegistered, "User not registered");
        _;
    }

    modifier onlyVerifier() {
        require(users[msg.sender].role == Role.Verifier || users[msg.sender].role == Role.Admin, "Not authorized");
        _;
    }

    modifier onlyAdmin() {
        require(users[msg.sender].role == Role.Admin, "Admin only");
        _;
    }

    function registerUser(string memory _name, Role _role, string memory _emailHash) public {
        // Allow updating for development purposes
        users[msg.sender] = User(_name, _role, true, _emailHash);
        emit UserRegistered(msg.sender, _name, _role);
    }

    function createServiceRequest(uint256 _serviceId, string memory _dataHash) public onlyRegistered {
        requestCount++;
        requests[requestCount] = ServiceRequest(
            requestCount,
            _serviceId,
            msg.sender,
            _dataHash,
            RequestStatus.Pending,
            block.timestamp,
            ""
        );
        emit RequestCreated(requestCount, msg.sender, _serviceId);
    }

    function updateRequestStatus(uint256 _requestId, RequestStatus _status, string memory _remarks) public onlyVerifier {
        require(_requestId > 0 && _requestId <= requestCount, "Invalid request ID");
        requests[_requestId].status = _status;
        requests[_requestId].remarks = _remarks;
        emit RequestStatusUpdated(_requestId, _status, msg.sender);
    }

    function registerLand(string memory _location, uint256 _area) public onlyRegistered {
        landCount++;
        lands[landCount] = Land(landCount, _location, _area, msg.sender, RequestStatus.Pending);
        emit LandRegistered(landCount, _location, msg.sender);
    }

    function approveLand(uint256 _landId) public onlyAdmin {
        require(_landId > 0 && _landId <= landCount, "Invalid land ID");
        require(lands[_landId].status == RequestStatus.Pending, "Land is not pending");
        lands[_landId].status = RequestStatus.Approved;
    }

    function rejectLand(uint256 _landId) public onlyAdmin {
        require(_landId > 0 && _landId <= landCount, "Invalid land ID");
        require(lands[_landId].status == RequestStatus.Pending, "Land is not pending");
        lands[_landId].status = RequestStatus.Rejected;
    }

    function requestFunds(string memory _purpose, uint256 _amount) public onlyRegistered {
        fundRequestCount++;
        fundRequests[fundRequestCount] = FundRequest(fundRequestCount, _purpose, _amount, msg.sender, false, block.timestamp);
        emit FundRequested(fundRequestCount, _purpose, _amount, msg.sender);
    }

    function approveFundRequest(uint256 _requestId) public onlyAdmin {
        require(_requestId > 0 && _requestId <= fundRequestCount, "Invalid fund request ID");
        require(!fundRequests[_requestId].approved, "Already approved");
        fundRequests[_requestId].approved = true;
        emit FundApproved(_requestId, msg.sender);
    }

    function getRequest(uint256 _requestId) public view returns (ServiceRequest memory) {
        return requests[_requestId];
    }
    
    function getUser(address _userAddress) public view returns (User memory) {
        return users[_userAddress];
    }

    function getLand(uint256 _landId) public view returns (Land memory) {
        return lands[_landId];
    }

    function getFundRequest(uint256 _requestId) public view returns (FundRequest memory) {
        return fundRequests[_requestId];
    }
}
