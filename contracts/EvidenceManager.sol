// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title EvidenceManager
 * @notice SeQureChain — Blockchain-Based Evidence Management System
 * @dev Stores evidence hashes and amendments immutably on Ethereum
 * @author SeQureChain Team · Lahore Garrison University
 */
contract EvidenceManager {

    // ── STRUCTS ──────────────────────────────────────────────────────────────

    struct Evidence {
        string   cid;           // IPFS Content Identifier
        string   fileHash;      // SHA-256 hash of the file
        string   description;
        string   location;      // GPS or place description
        string   evidenceType;  // image | video | document | forensic | audio | gps
        address  uploadedBy;    // MetaMask wallet address
        uint256  timestamp;     // Block timestamp
        bool     exists;
    }

    struct Amendment {
        string   amendmentId;
        string   note;
        address  addedBy;
        uint256  timestamp;
    }

    // ── STATE ─────────────────────────────────────────────────────────────────

    mapping(string => Evidence)    private evidenceRecords;
    mapping(string => Amendment[]) private evidenceAmendments;
    string[]                       private evidenceIds;

    address public immutable owner;

    // ── EVENTS ────────────────────────────────────────────────────────────────

    event EvidenceSubmitted(
        string  indexed evidenceId,
        string          cid,
        string          fileHash,
        address indexed uploadedBy,
        uint256         timestamp
    );

    event AmendmentAdded(
        string  indexed evidenceId,
        string          amendmentId,
        address indexed addedBy,
        uint256         timestamp
    );

    event EvidenceAccessed(
        string  indexed evidenceId,
        address indexed accessedBy,
        uint256         timestamp
    );

    // ── MODIFIERS ─────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    modifier evidenceExists(string memory evidenceId) {
        require(evidenceRecords[evidenceId].exists, "Evidence not found");
        _;
    }

    // ── CONSTRUCTOR ───────────────────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
    }

    // ── WRITE FUNCTIONS ───────────────────────────────────────────────────────

    /**
     * @notice Submit a new evidence record to the blockchain
     * @param evidenceId  Unique ID (SQC-<timestamp>-<uuid>)
     * @param cid         IPFS CID from Pinata
     * @param fileHash    SHA-256 hash of the original file
     * @param description Human-readable description
     * @param location    GPS coordinates or location string
     * @param evidenceType Type of evidence (image, video, etc.)
     */
    function submitEvidence(
        string memory evidenceId,
        string memory cid,
        string memory fileHash,
        string memory description,
        string memory location,
        string memory evidenceType
    ) external {
        require(bytes(evidenceId).length > 0,  "evidenceId required");
        require(bytes(cid).length > 0,         "CID required");
        require(bytes(fileHash).length > 0,    "fileHash required");
        require(!evidenceRecords[evidenceId].exists, "Evidence already submitted");

        evidenceRecords[evidenceId] = Evidence({
            cid:          cid,
            fileHash:     fileHash,
            description:  description,
            location:     location,
            evidenceType: evidenceType,
            uploadedBy:   msg.sender,
            timestamp:    block.timestamp,
            exists:       true
        });

        evidenceIds.push(evidenceId);

        emit EvidenceSubmitted(evidenceId, cid, fileHash, msg.sender, block.timestamp);
    }

    /**
     * @notice Add an amendment to an existing evidence record
     * @dev Original record stays immutable — amendments are appended only
     * @param evidenceId  ID of the evidence to amend
     * @param amendmentId Unique amendment ID (AMD-<timestamp>-<uuid>)
     * @param note        Amendment description / correction
     */
    function addAmendment(
        string memory evidenceId,
        string memory amendmentId,
        string memory note
    ) external evidenceExists(evidenceId) {
        require(bytes(amendmentId).length > 0, "amendmentId required");
        require(bytes(note).length > 0,        "note required");

        evidenceAmendments[evidenceId].push(Amendment({
            amendmentId: amendmentId,
            note:        note,
            addedBy:     msg.sender,
            timestamp:   block.timestamp
        }));

        emit AmendmentAdded(evidenceId, amendmentId, msg.sender, block.timestamp);
    }

    // ── READ FUNCTIONS ────────────────────────────────────────────────────────

    /**
     * @notice Read an evidence record (view-only, no gas cost)
     */
    function getEvidenceReadOnly(string memory evidenceId)
        external
        view
        evidenceExists(evidenceId)
        returns (
            string memory cid,
            string memory fileHash,
            string memory description,
            string memory location,
            string memory evidenceType,
            address       uploadedBy,
            uint256       timestamp
        )
    {
        Evidence storage e = evidenceRecords[evidenceId];
        return (e.cid, e.fileHash, e.description, e.location, e.evidenceType, e.uploadedBy, e.timestamp);
    }

    /**
     * @notice Verify file integrity by comparing stored hash vs provided hash
     * @return true if hashes match (evidence unmodified), false if tampered
     */
    function verifyIntegrity(
        string memory evidenceId,
        string memory fileHash
    ) external view evidenceExists(evidenceId) returns (bool) {
        return keccak256(abi.encodePacked(evidenceRecords[evidenceId].fileHash))
            == keccak256(abi.encodePacked(fileHash));
    }

    /**
     * @notice Get all amendments for an evidence record
     */
    function getAmendments(string memory evidenceId)
        external
        view
        evidenceExists(evidenceId)
        returns (Amendment[] memory)
    {
        return evidenceAmendments[evidenceId];
    }

    /**
     * @notice Total number of evidence records stored on-chain
     */
    function getEvidenceCount() external view returns (uint256) {
        return evidenceIds.length;
    }

    /**
     * @notice Get evidence ID at a specific index
     */
    function getEvidenceIdByIndex(uint256 index) external view returns (string memory) {
        require(index < evidenceIds.length, "Index out of bounds");
        return evidenceIds[index];
    }

    /**
     * @notice Check whether an evidence ID exists on-chain
     */
    function evidenceExistsCheck(string memory evidenceId) external view returns (bool) {
        return evidenceRecords[evidenceId].exists;
    }

    /**
     * @notice Get amendment count for an evidence record
     */
    function getAmendmentCount(string memory evidenceId)
        external
        view
        evidenceExists(evidenceId)
        returns (uint256)
    {
        return evidenceAmendments[evidenceId].length;
    }
}
