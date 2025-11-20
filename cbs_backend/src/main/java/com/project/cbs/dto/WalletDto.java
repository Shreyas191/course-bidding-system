package com.project.cbs.dto;

public class WalletDto {
    private Long walletId;
    private Integer balance;
    private Long studentId;

    public WalletDto() {}

    public WalletDto(Long walletId, Integer balance, Long studentId) {
        this.walletId = walletId;
        this.balance = balance;
        this.studentId = studentId;
    }

    // Getters and Setters
    public Long getWalletId() { return walletId; }
    public void setWalletId(Long walletId) { this.walletId = walletId; }

    public Integer getBalance() { return balance; }
    public void setBalance(Integer balance) { this.balance = balance; }

    public Long getStudentId() { return studentId; }
    public void setStudentId(Long studentId) { this.studentId = studentId; }
}
