package com.project.cbs.dto;

public class WalletDto {
    private Long walletId;
    private Integer balance;
    private Long studentId;
    
    // NEW: Track spending and locked amounts
    private Integer totalSpent;
    private Integer lockedAmount;      // Amount in pending bids
    private Integer availableBalance;  // balance - lockedAmount

    public WalletDto() {}

    public WalletDto(Long walletId, Integer balance, Long studentId) {
        this.walletId = walletId;
        this.balance = balance;
        this.studentId = studentId;
    }
    
    // Full constructor with new fields
    public WalletDto(Long walletId, Integer balance, Long studentId, 
                     Integer totalSpent, Integer lockedAmount) {
        this.walletId = walletId;
        this.balance = balance;
        this.studentId = studentId;
        this.totalSpent = totalSpent;
        this.lockedAmount = lockedAmount;
        this.availableBalance = balance - (lockedAmount != null ? lockedAmount : 0);
    }

    // Getters and Setters
    public Long getWalletId() { return walletId; }
    public void setWalletId(Long walletId) { this.walletId = walletId; }
    
    public Integer getBalance() { return balance; }
    public void setBalance(Integer balance) { 
        this.balance = balance;
        calculateAvailableBalance();
    }
    
    public Long getStudentId() { return studentId; }
    public void setStudentId(Long studentId) { this.studentId = studentId; }
    
    // NEW getters and setters
    public Integer getTotalSpent() { return totalSpent; }
    public void setTotalSpent(Integer totalSpent) { this.totalSpent = totalSpent; }
    
    public Integer getLockedAmount() { return lockedAmount; }
    public void setLockedAmount(Integer lockedAmount) { 
        this.lockedAmount = lockedAmount;
        calculateAvailableBalance();
    }
    
    public Integer getAvailableBalance() { return availableBalance; }
    public void setAvailableBalance(Integer availableBalance) { 
        this.availableBalance = availableBalance; 
    }
    
    private void calculateAvailableBalance() {
        if (this.balance != null && this.lockedAmount != null) {
            this.availableBalance = this.balance - this.lockedAmount;
        }
    }
}
