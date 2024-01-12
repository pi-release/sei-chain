package wasm

import (
	"encoding/base64"
	"encoding/json"

	wasmvmtypes "github.com/CosmWasm/wasmvm/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/sei-protocol/sei-chain/wasmbinding/bindings"
	"github.com/sei-protocol/sei-chain/x/evm/types"
)

func EncodeCallEVM(rawMsg json.RawMessage, sender sdk.AccAddress, info wasmvmtypes.MessageInfo) ([]sdk.Msg, error) {
	encodedCallEVM := bindings.CallEVM{}
	if err := json.Unmarshal(rawMsg, &encodedCallEVM); err != nil {
		return []sdk.Msg{}, err
	}
	decodedData, err := base64.StdEncoding.DecodeString(encodedCallEVM.Data)
	if err != nil {
		return []sdk.Msg{}, err
	}
	s := sender
	if origSender, err := sdk.AccAddressFromBech32(info.Sender); err == nil {
		s = origSender
	}
	internalCallEVMMsg := types.MsgInternalEVMCall{
		Sender:       s.String(),
		To:           encodedCallEVM.To,
		Value:        encodedCallEVM.Value,
		Data:         decodedData,
		FromContract: sender.String(),
	}
	return []sdk.Msg{&internalCallEVMMsg}, nil
}