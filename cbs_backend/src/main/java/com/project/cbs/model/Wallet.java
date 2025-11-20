package com.project.cbs.model;

import lombok.Data;
import java.sql.Timestamp;

@Data
public class Wallet {
    private Long walletId;
    private Long studentId;
    private Integer balance;
    private Integer totalSpent;
    private Timestamp createdAt;
    private Timestamp updatedAt;
}
